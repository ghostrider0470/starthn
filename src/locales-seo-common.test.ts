// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Content rules for seo.json, common.json and blog.json in the indexable
 * locales. The other locale folders stay reachable (noindex) and are covered
 * by a separate parity test, so they are deliberately not asserted here.
 */
const KEPT_LOCALES = ['bs-BA', 'en-US', 'hr-HR'] as const
const SOURCE_LOCALE = 'en-US'
const NAMESPACES = ['seo', 'common', 'blog'] as const

const LOCALES_DIR = join(process.cwd(), 'public', 'locales')

const SEO_PAGE_KEYS = [
  'home',
  'about',
  'services',
  'serviceBookkeeping',
  'serviceTaxConsulting',
  'serviceVirtualCfo',
  'serviceBusinessConsulting',
  'serviceFinancialReporting',
  'serviceEducation',
  'careers',
  'certificates',
  'missionVision',
  'contact',
  'blog',
  'privacy',
  'terms',
  'notFound',
] as const

const SECTION_KEYS = [
  'overview',
  'story',
  'proof',
  'gallery',
  'values',
  'team',
  'culture',
  'jobs',
  'process',
  'channels',
  'contact',
  'start',
  'home',
  'services',
  'why',
  'evidence',
  'trust',
  'faq',
  'scope',
  'outputs',
] as const

const BREADCRUMB_KEYS = [
  'home',
  'services',
  'about',
  'missionVision',
  'certificates',
  'careers',
  'contact',
  'blog',
  'privacy',
  'terms',
  'serviceBookkeeping',
  'serviceTaxConsulting',
  'serviceVirtualCfo',
  'serviceBusinessConsulting',
  'serviceFinancialReporting',
  'serviceEducation',
] as const

const A11Y_KEYS = [
  'prevSlide',
  'nextSlide',
  'goToSlide',
  'pauseCarousel',
  'resumeCarousel',
  'slides',
  'prevTestimonial',
  'nextTestimonial',
  'goToTestimonial',
  'testimonialCounter',
  'prevSection',
  'nextSection',
  'goToSection',
  'toggleTheme',
] as const

const CONSENT_KEYS = [
  'title',
  'text',
  'accept',
  'reject',
  'settings',
  'privacyLink',
] as const

/** Old addresses, template copy, brand mistranslations, old phone, old email. */
const FORBIDDEN =
  /vilson|wilson|ويلسون|ウィルソン|윌슨|enterprise software|AI solutions|engineering team|Pokreni HN|Počni s HN|Početak HN|Pokrenite HN|Fejsbuk|135[\s/-]?377|info@starthn\.ba/i

/** Croatian forms that must not appear in Bosnian (ijekavian) copy. */
const BOSNIAN_CROATIANISMS =
  /tvrtk|financij|tisuć|tjedan|uvjet|obvez|točn|izvješć|pravodobn|sveučiliš/i

const ADDRESS = 'Ibrahima Ljubovića 47, 71210 Ilidža'
const PHONE = '061 221 368'

type Json =
  | string
  | number
  | boolean
  | null
  | Array<Json>
  | { [k: string]: Json }

function read(locale: string, namespace: string): Json {
  return JSON.parse(
    readFileSync(join(LOCALES_DIR, locale, `${namespace}.json`), 'utf8'),
  ) as Json
}

function flatten(value: Json, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  if (typeof value === 'string') {
    out.set(prefix, value)
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => {
      for (const [k, v] of flatten(item, `${prefix}.${i}`)) out.set(k, v)
    })
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      for (const [k, v] of flatten(nested, prefix ? `${prefix}.${key}` : key)) {
        out.set(k, v)
      }
    }
  }
  return out
}

/** Unicode code-point length (what search engines count, not UTF-16 units). */
const len = (s: string) => [...s].length

const placeholders = (s: string) =>
  [...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort()

type SeoEntry = { title: string; description: string }
type SeoFile = { default: SeoEntry; pages: Record<string, SeoEntry> }

describe.each(KEPT_LOCALES)('%s seo.json', (locale) => {
  const seo = read(locale, 'seo') as unknown as SeoFile

  it.each(SEO_PAGE_KEYS)(
    'pages.%s has a full, well-sized title and description',
    (key) => {
      const entry = seo.pages[key]
      expect(entry, `${locale} seo:pages.${key}`).toBeDefined()
      const { title, description } = entry
      expect(title.trim()).not.toBe('')
      expect(description.trim()).not.toBe('')
      expect(title).toContain('Start HN')
      expect(len(title), `title "${title}"`).toBeLessThanOrEqual(60)
      expect(
        len(description),
        `description "${description}"`,
      ).toBeGreaterThanOrEqual(70)
      expect(
        len(description),
        `description "${description}"`,
      ).toBeLessThanOrEqual(160)
    },
  )

  it('default title and description follow the same limits', () => {
    const { title, description } = seo.default
    expect(title).toContain('Start HN')
    expect(len(title)).toBeLessThanOrEqual(60)
    expect(len(description)).toBeGreaterThanOrEqual(70)
    expect(len(description)).toBeLessThanOrEqual(160)
  })

  it('titles and descriptions are unique within the locale', () => {
    const entries = [seo.default, ...Object.values(seo.pages)]
    const titles = entries.map((e) => e.title)
    const descriptions = entries.map((e) => e.description)
    const dupes = (list: Array<string>) =>
      list.filter((v, i) => list.indexOf(v) !== i)
    expect(dupes(titles)).toEqual([])
    expect(dupes(descriptions)).toEqual([])
  })

  it('contact description carries the current address and phone', () => {
    expect(seo.pages.contact.description).toContain(ADDRESS)
    expect(seo.pages.contact.description).toContain(PHONE)
  })
})

describe.each(KEPT_LOCALES)('%s common.json', (locale) => {
  const common = read(locale, 'common') as Record<string, any>

  it('has the tagline, sections, breadcrumbs, a11y and consent keys', () => {
    const expectKeys = (group: string, keys: ReadonlyArray<string>) => {
      for (const key of keys) {
        const value = common[group]?.[key]
        expect(typeof value, `${locale} common:${group}.${key}`).toBe('string')
        expect(
          (value as string).trim(),
          `${locale} common:${group}.${key}`,
        ).not.toBe('')
      }
    }
    expect(typeof common.nav?.tagline).toBe('string')
    expect(common.nav.tagline).not.toBe('')
    expectKeys('sections', SECTION_KEYS)
    expectKeys('breadcrumbs', BREADCRUMB_KEYS)
    expectKeys('a11y', A11Y_KEYS)
    expectKeys('consent', CONSENT_KEYS)
  })

  it('footer uses the literal brand, current NAP and a plain Blog link', () => {
    const footer = common.footer
    expect(footer.copyright).toContain('Start HN')
    expect(footer.copyright).toContain('{{year}}')
    expect(footer.companyLinks.blog).toBe('Blog')
    expect(footer.contactInfo.email).toBe('klijenti@starthn.ba')
    expect(footer.contactInfo.street).toBe('Ibrahima Ljubovića 47')
    expect(footer.contactInfo.locality).toBe('71210 Ilidža')
    expect(footer.contactInfo.phone.replace(/\D/g, '')).toBe('38761221368')
  })

  it('consent banner names both analytics tools', () => {
    expect(common.consent.text).toContain('Google Analytics')
    expect(common.consent.text).toContain('Microsoft Clarity')
  })
})

describe('bs-BA wording', () => {
  it('uses the agreed Bosnian consent and navigation labels', () => {
    const common = read('bs-BA', 'common') as Record<string, any>
    expect(common.nav.home).toBe('Početna')
    expect(common.nav.tagline).toBe('Računovodstvena agencija')
    expect(common.consent.accept).toBe('Prihvatam')
    expect(common.consent.reject).toBe('Odbijam')
    expect(common.consent.settings).toBe('Postavke kolačića')
    expect(common.consent.privacyLink).toBe('Politika privatnosti')
  })

  it('has no Croatian forms in seo, common or blog strings', () => {
    const hits: Array<string> = []
    for (const ns of NAMESPACES) {
      for (const [path, value] of flatten(read('bs-BA', ns))) {
        if (BOSNIAN_CROATIANISMS.test(value))
          hits.push(`${ns}:${path}=${value}`)
      }
    }
    expect(hits).toEqual([])
  })
})

describe('kept locales: shared content rules', () => {
  it('no seo, common or blog value contains template leftovers, old NAP or brand mistranslations', () => {
    const hits: Array<string> = []
    for (const locale of KEPT_LOCALES) {
      for (const ns of NAMESPACES) {
        for (const [path, value] of flatten(read(locale, ns))) {
          if (FORBIDDEN.test(value))
            hits.push(`${locale}/${ns}:${path}=${value}`)
        }
      }
    }
    expect(hits).toEqual([])
  })

  it('every string whose en-US value contains "Start HN" keeps the literal brand', () => {
    const misses: Array<string> = []
    for (const ns of ['common', 'blog'] as const) {
      const source = flatten(read(SOURCE_LOCALE, ns))
      for (const locale of KEPT_LOCALES) {
        const target = flatten(read(locale, ns))
        for (const [path, value] of source) {
          if (!value.includes('Start HN')) continue
          const localized = target.get(path)
          if (!localized?.includes('Start HN')) {
            misses.push(`${locale}/${ns}:${path}=${localized ?? '<missing>'}`)
          }
        }
      }
    }
    expect(misses).toEqual([])
  })

  it('has the same keys and interpolation placeholders as en-US', () => {
    const problems: Array<string> = []
    for (const ns of NAMESPACES) {
      const source = flatten(read(SOURCE_LOCALE, ns))
      for (const locale of KEPT_LOCALES) {
        if (locale === SOURCE_LOCALE) continue
        const target = flatten(read(locale, ns))
        for (const [path, value] of source) {
          const localized = target.get(path)
          if (localized === undefined) {
            problems.push(`${locale}/${ns}:${path} missing`)
            continue
          }
          if (placeholders(localized).join() !== placeholders(value).join()) {
            problems.push(`${locale}/${ns}:${path} placeholders differ`)
          }
        }
        for (const path of target.keys()) {
          if (!source.has(path))
            problems.push(`${locale}/${ns}:${path} not in en-US`)
        }
      }
    }
    expect(problems).toEqual([])
  })

  it('blog author role is "Author", not "Publisher"', () => {
    const roles = Object.fromEntries(
      KEPT_LOCALES.map((locale) => [
        locale,
        (read(locale, 'blog') as Record<string, any>).author.role,
      ]),
    )
    expect(roles).toEqual({
      'bs-BA': 'Autor',
      'en-US': 'Author',
      'hr-HR': 'Autor',
    })
  })
})
