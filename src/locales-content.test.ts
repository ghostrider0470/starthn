import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SERVICE_IDS } from '@/lib/service-routes'

/**
 * Content checks for the pages, landing and services namespaces.
 *
 * Only the indexable locales are asserted here (bs-BA, en-US, hr-HR). The
 * other locale folders stay reachable (noindex) and are translated
 * separately.
 */
const KEPT_LOCALES = ['bs-BA', 'en-US', 'hr-HR'] as const
const NAMESPACES = ['pages', 'landing', 'services'] as const
const LOCALES_DIR = join(process.cwd(), 'public', 'locales')

type Locale = (typeof KEPT_LOCALES)[number]
type Namespace = (typeof NAMESPACES)[number]
type JsonValue =
  | string
  | number
  | boolean
  | null
  | Array<JsonValue>
  | { [key: string]: JsonValue }

function readRaw(locale: Locale, ns: Namespace): string {
  return readFileSync(join(LOCALES_DIR, locale, `${ns}.json`), 'utf8')
}

function read(locale: Locale, ns: Namespace): JsonValue {
  return JSON.parse(readRaw(locale, ns)) as JsonValue
}

function flattenStrings(value: JsonValue, prefix = ''): Map<string, string> {
  const result = new Map<string, string>()
  if (typeof value === 'string') {
    result.set(prefix, value)
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      for (const [path, text] of flattenStrings(item, `${prefix}.${index}`)) {
        result.set(path, text)
      }
    })
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key
      for (const [nestedPath, text] of flattenStrings(nested, path)) {
        result.set(nestedPath, text)
      }
    }
  }
  return result
}

function getPath(value: JsonValue, path: string): JsonValue | undefined {
  let current: JsonValue | undefined = value
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined
    current = Array.isArray(current)
      ? current[Number(part)]
      : (current as Record<string, JsonValue>)[part]
  }
  return current
}

function placeholders(text: string): string {
  return [...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)]
    .map((match) => match[1])
    .sort()
    .join(',')
}

const wordCount = (text: string) => text.trim().split(/\s+/).length

const bundles = Object.fromEntries(
  KEPT_LOCALES.map((locale) => [
    locale,
    Object.fromEntries(NAMESPACES.map((ns) => [ns, read(locale, ns)])),
  ]),
) as Record<Locale, Record<Namespace, JsonValue>>

const FORBIDDEN =
  /vilson|wilson|CRP Inkubator|Pokreni HN|Počni s HN|Početak HN|share\.google|info@starthn\.ba|061[\s/]*135[\s-]*377/i

const BOSNIAN_CROATIANISMS =
  /tvrtk|financij|desetljeć|reagiranje|informirane|Automatiziramo|identificiramo/

const ADDRESS = 'Ibrahima Ljubovića 47, 71210 Ilidža'

const REQUIRED_KEYS: Record<Namespace, Array<string>> = {
  pages: [
    'contact.methods.email.value',
    'contact.methods.location.description',
    'contact.methods.location.value',
    'contact.methods.phone.title',
    'contact.methods.phone.description',
    'contact.methods.phone.value',
    'contact.methods.hours.title',
    'contact.methods.hours.description',
    'contact.methods.hours.value',
    'certificates.quote',
    'certificates.quoteAuthor',
    'certificates.licenceLine',
    'certificates.verifyLink',
    'error.notFound.badge',
    'error.loading.blog',
    'blog.index.filters.advanced',
    'blog.index.filters.searchPlaceholder',
    'blog.index.filters.filterByTag',
    'blog.index.filters.clearTag',
    'blog.index.filters.searchTags',
    'blog.index.filters.noTagsMatch',
    'blog.index.pagination.label',
    'blog.index.pagination.previous',
    'blog.index.pagination.next',
    'blog.index.pagination.showing',
    'blog.index.pagination.show',
    'blog.index.noPosts',
    'blog.index.noResults',
    'blog.index.clearFilters',
    'about.images.heroAlt',
    'about.images.interiorAlt',
    'missionVision.images.heroAlt',
    'missionVision.images.interiorAlt',
  ],
  landing: ['hero.h1', 'hero.intro', 'guide.linkText', 'guide.description'],
  services: [
    'index.title',
    'index.description',
    'related.title',
    'related.postsTitle',
  ],
}

describe('locale content (pages, landing, services)', () => {
  it.each(KEPT_LOCALES)('%s bundles parse as JSON objects', (locale) => {
    for (const ns of NAMESPACES) {
      expect(() => JSON.parse(readRaw(locale, ns))).not.toThrow()
      const value = bundles[locale][ns]
      expect(value && typeof value === 'object' && !Array.isArray(value)).toBe(
        true,
      )
    }
  })

  it('contains no template leftovers, old addresses, old phone or old email', () => {
    const hits: Array<string> = []
    for (const locale of KEPT_LOCALES) {
      for (const ns of NAMESPACES) {
        for (const [path, text] of flattenStrings(bundles[locale][ns])) {
          if (FORBIDDEN.test(text)) hits.push(`${locale}/${ns}:${path}=${text}`)
        }
      }
    }
    expect(hits).toEqual([])
  })

  it('keeps the literal brand wherever the English source has it', () => {
    const missing: Array<string> = []
    for (const ns of NAMESPACES) {
      const source = flattenStrings(bundles['en-US'][ns])
      for (const locale of KEPT_LOCALES) {
        const target = flattenStrings(bundles[locale][ns])
        for (const [path, text] of source) {
          if (!text.includes('Start HN')) continue
          const value = target.get(path)
          if (value !== undefined && !value.includes('Start HN')) {
            missing.push(`${locale}/${ns}:${path}=${value}`)
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('never translates or transliterates the street address', () => {
    const bad: Array<string> = []
    for (const locale of KEPT_LOCALES) {
      for (const ns of NAMESPACES) {
        for (const [path, text] of flattenStrings(bundles[locale][ns])) {
          if (/Ljubovi/i.test(text) && !text.includes(ADDRESS)) {
            bad.push(`${locale}/${ns}:${path}`)
          }
        }
      }
    }
    expect(bad).toEqual([])
  })

  it.each(KEPT_LOCALES)(
    '%s has every new key as a non-empty string',
    (locale) => {
      const missing: Array<string> = []
      for (const ns of NAMESPACES) {
        for (const key of REQUIRED_KEYS[ns]) {
          const value = getPath(bundles[locale][ns], key)
          if (typeof value !== 'string' || value.trim() === '') {
            missing.push(`${ns}:${key}`)
          }
        }
      }
      expect(missing).toEqual([])
    },
  )

  it.each(KEPT_LOCALES)(
    '%s keeps the same {{placeholders}} as en-US',
    (locale) => {
      const mismatches: Array<string> = []
      for (const ns of NAMESPACES) {
        const source = flattenStrings(bundles['en-US'][ns])
        const target = flattenStrings(bundles[locale][ns])
        for (const [path, text] of source) {
          const value = target.get(path)
          if (
            value !== undefined &&
            placeholders(value) !== placeholders(text)
          ) {
            mismatches.push(`${ns}:${path}`)
          }
        }
      }
      expect(mismatches).toEqual([])
    },
  )

  it.each(KEPT_LOCALES)(
    '%s shows the current NAP on the contact page',
    (locale) => {
      const pages = bundles[locale].pages
      expect(getPath(pages, 'contact.methods.email.value')).toBe(
        'klijenti@starthn.ba',
      )
      expect(getPath(pages, 'contact.methods.phone.value')).toBe('061 221 368')
      expect(
        String(getPath(pages, 'contact.methods.location.value')),
      ).toContain(ADDRESS)
      // The SRR licence number stays off until the owner confirms it is
      // current; the FMF register entry is shown.
      const licenceLine = String(getPath(pages, 'certificates.licenceLine'))
      expect(licenceLine).toContain('UP-04-11-2-6-1516/24')
      expect(licenceLine).not.toContain('CR-6093')
    },
  )

  it.each(KEPT_LOCALES)(
    '%s landing drops dead template subtrees and the opaque client link',
    (locale) => {
      const landing = bundles[locale].landing as Record<string, JsonValue>
      expect(landing).not.toHaveProperty('credibility')
      expect(landing).not.toHaveProperty('partners')

      const clients = getPath(landing, 'clients.items') as Array<
        Record<string, JsonValue>
      >
      const rukaPodrske = clients.find(
        (client) => client.name === 'Ruka Podrške',
      )
      expect(rukaPodrske).toBeDefined()
      expect(rukaPodrske).not.toHaveProperty('href')

      const options = getPath(landing, 'contactCta.serviceOptions')
      expect(Array.isArray(options) && options.length).toBe(7)
    },
  )

  it('keeps client names identical across locales', () => {
    const names = (locale: Locale) =>
      (
        getPath(bundles[locale].landing, 'clients.items') as Array<
          Record<string, JsonValue>
        >
      ).map((client) => client.name)
    for (const locale of KEPT_LOCALES) {
      expect(names(locale)).toEqual(names('bs-BA'))
    }
  })

  it.each(KEPT_LOCALES)(
    '%s service items carry local content and valid cross-links',
    (locale) => {
      const services = bundles[locale].services
      const postLabels = getPath(services, 'related.postLabels') as Record<
        string,
        JsonValue
      >
      const heroTitles = new Set<string>()
      const interiorAlts = new Set<string>()

      for (const id of SERVICE_IDS) {
        const item = getPath(services, `items.${id}`) as Record<
          string,
          JsonValue
        >
        for (const key of [
          'heroTitle',
          'interiorAlt',
          'localContextTitle',
          'localContext',
        ]) {
          expect(typeof item[key], `${id}.${key}`).toBe('string')
          expect(String(item[key]).trim(), `${id}.${key}`).not.toBe('')
        }
        heroTitles.add(String(item.heroTitle))
        interiorAlts.add(String(item.interiorAlt))

        const words = wordCount(String(item.localContext))
        expect(words, `${id}.localContext word count`).toBeGreaterThanOrEqual(
          60,
        )
        expect(words, `${id}.localContext word count`).toBeLessThanOrEqual(120)
        expect(String(item.localContext)).toMatch(
          /Sarajev|Ilidž|FBiH|Federacij|Federation/,
        )
        expect(String(item.localContext)).not.toMatch(
          /\bKM\b|\d+[.,]\d{2}\s*KM/,
        )

        const related = item.related as Array<string>
        expect(Array.isArray(related), `${id}.related`).toBe(true)
        expect(related.length).toBeGreaterThanOrEqual(2)
        expect(related.length).toBeLessThanOrEqual(3)
        expect(new Set(related).size).toBe(related.length)
        expect(related).not.toContain(id)
        for (const relatedId of related) {
          expect(SERVICE_IDS as ReadonlyArray<string>).toContain(relatedId)
        }

        const relatedPosts = item.relatedPosts as Array<string>
        expect(Array.isArray(relatedPosts), `${id}.relatedPosts`).toBe(true)
        for (const slug of relatedPosts) {
          expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          expect(typeof postLabels[slug], `related.postLabels.${slug}`).toBe(
            'string',
          )
        }
      }

      expect(heroTitles.size).toBe(SERVICE_IDS.length)
      expect(interiorAlts.size).toBe(SERVICE_IDS.length)
    },
  )

  it('uses the same cross-link structure in every locale', () => {
    const structure = (locale: Locale) =>
      SERVICE_IDS.map((id) => {
        const item = getPath(bundles[locale].services, `items.${id}`) as Record<
          string,
          JsonValue
        >
        return { id, related: item.related, relatedPosts: item.relatedPosts }
      })
    for (const locale of KEPT_LOCALES) {
      expect(structure(locale)).toEqual(structure('bs-BA'))
    }
  })

  it('keeps Bosnian copy free of Croatian forms', () => {
    const hits: Array<string> = []
    for (const ns of NAMESPACES) {
      for (const [path, text] of flattenStrings(bundles['bs-BA'][ns])) {
        if (BOSNIAN_CROATIANISMS.test(text)) hits.push(`${ns}:${path}=${text}`)
      }
    }
    expect(hits).toEqual([])
  })
})
