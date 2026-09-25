// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInstance } from 'i18next'
import { describe, expect, it } from 'vitest'
import { SERVICE_IDS } from '@/lib/service-routes'

/**
 * Copy for the conversion round (tap-to-call, directions, rating and legal
 * line, service prices and FAQs, the Ilidža location block, careers as an
 * open application) in the indexable locales.
 *
 * Besides shape, these tests guard the rule that copy must not invent facts:
 * the only prices are the public ones from the home FAQ, no tax rates, no
 * served neighbourhoods or directions detail the owner has not confirmed.
 */
const KEPT_LOCALES = ['bs-BA', 'en-US', 'hr-HR'] as const
type Locale = (typeof KEPT_LOCALES)[number]
const LOCALES_DIR = join(process.cwd(), 'public', 'locales')

type Json =
  | string
  | number
  | boolean
  | null
  | Array<Json>
  | { [k: string]: Json }

function read(locale: string, ns: string): any {
  return JSON.parse(
    readFileSync(join(LOCALES_DIR, locale, `${ns}.json`), 'utf8'),
  )
}

function strings(value: Json, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]]
  if (Array.isArray(value))
    return value.flatMap((v, i) => strings(v, `${prefix}.${i}`))
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) =>
      strings(v, prefix ? `${prefix}.${k}` : k),
    )
  return []
}

const PUBLIC_NAMESPACES = [
  'common',
  'seo',
  'landing',
  'pages',
  'services',
] as const

function i18nFor(locale: Locale) {
  const i18n = createInstance()
  void i18n.init({
    lng: locale,
    fallbackLng: false,
    ns: [...PUBLIC_NAMESPACES],
    defaultNS: 'common',
    resources: {
      [locale]: Object.fromEntries(
        PUBLIC_NAMESPACES.map((ns) => [ns, read(locale, ns)]),
      ),
    },
    initAsync: false,
    interpolation: { escapeValue: false },
  })
  return i18n
}

const ADDRESS = 'Ibrahima Ljubovića 47, 71210 Ilidža'

describe('rating, call and legal-entity strings render through i18next', () => {
  it('bs-BA declines "recenzija" by count', () => {
    const t = i18nFor('bs-BA').t
    expect(t('trust.ratingLine', { rating: '5,0', count: 19 })).toBe(
      '5,0 ★ na Googleu (19 recenzija)',
    )
    expect(t('trust.ratingLine', { rating: '5,0', count: 22 })).toBe(
      '5,0 ★ na Googleu (22 recenzije)',
    )
    expect(t('trust.ratingLine', { rating: '5,0', count: 21 })).toBe(
      '5,0 ★ na Googleu (21 recenzija)',
    )
    expect(
      t('stats.items.hours.description', { ns: 'landing', count: 19 }),
    ).toBe(
      'Prosječna ocjena naših klijenata na Google profilu agencije (19 recenzija).',
    )
    expect(
      t('stats.items.hours.description', { ns: 'landing', count: 23 }),
    ).toBe(
      'Prosječna ocjena naših klijenata na Google profilu agencije (23 recenzije).',
    )
  })

  it('hr-HR declines "recenzija" by count', () => {
    const t = i18nFor('hr-HR').t
    expect(t('trust.ratingLine', { rating: '5,0', count: 19 })).toBe(
      '5,0 ★ na Googleu (19 recenzija)',
    )
    expect(t('trust.ratingLine', { rating: '5,0', count: 3 })).toBe(
      '5,0 ★ na Googleu (3 recenzije)',
    )
  })

  it('en-US uses singular and plural "review"', () => {
    const t = i18nFor('en-US').t
    expect(t('trust.ratingLine', { rating: '5.0', count: 19 })).toBe(
      '5.0 ★ on Google (19 reviews)',
    )
    expect(t('trust.ratingLine', { rating: '5.0', count: 1 })).toBe(
      '5.0 ★ on Google (1 review)',
    )
  })

  it.each(KEPT_LOCALES)(
    '%s fills the call label and the legal line',
    (locale) => {
      const t = i18nFor(locale).t
      expect(t('contactActions.callNumber', { phone: '061 221 368' })).toMatch(
        /061 221 368$/,
      )
      const line = t('legalEntity.line', {
        legalName: 'Računovodstvena agencija START HN d.o.o.',
        jib: '4203402150001',
        mbs: '65-01-1010-24',
        address: ADDRESS,
      })
      expect(line).toContain('Računovodstvena agencija START HN d.o.o.')
      expect(line).toContain('4203402150001')
      expect(line).toContain('65-01-1010-24')
      expect(line).toContain(ADDRESS)
      expect(line).not.toMatch(/\{\{/)
    },
  )
})

describe.each(KEPT_LOCALES)('%s conversion copy', (locale: Locale) => {
  const landing = read(locale, 'landing')
  const pages = read(locale, 'pages')
  const services = read(locale, 'services')
  const seo = read(locale, 'seo')
  const all = PUBLIC_NAMESPACES.flatMap((ns) =>
    strings(read(locale, ns)).map(([k, v]) => [`${ns}:${k}`, v] as const),
  )

  it('quotes only the public prices (150 KM obrt, 300 KM d.o.o.)', () => {
    const amounts = new Set<number>()
    for (const [, text] of all) {
      for (const m of text.matchAll(/(\d[\d.,]*)\s*KM\b/g)) {
        amounts.add(Number.parseInt(m[1].replace(/[.,]\d{2}$/, ''), 10))
      }
      // EUR equivalents at the fixed rate 1 EUR = 1.95583 KM.
      for (const m of text.matchAll(/€\s?(\d+)/g)) {
        expect([77, 153], text).toContain(Number(m[1]))
      }
    }
    expect([...amounts].sort()).toEqual([150, 300])
  })

  it('shows the bookkeeping prices, drivers and quote copy', () => {
    const pricing = services.items.bookkeeping.pricing
    expect(pricing.plans.map((p: { price: string }) => p.price)).toEqual([
      expect.stringContaining('150 KM'),
      expect.stringContaining('300 KM'),
    ])
    expect(pricing.drivers).toHaveLength(4)
    expect(services.common.requestQuote.trim()).not.toBe('')
    expect(services.items.bookkeeping.payroll.title).toMatch(
      /Obračun plata i doprinosa|Obračun plaća i doprinosa|Payroll and contributions/,
    )
  })

  it('gives every service 3-5 FAQs with a question and a direct answer', () => {
    for (const id of SERVICE_IDS) {
      const faq = services.items[id].faq
      expect(faq.title.trim(), id).not.toBe('')
      expect(faq.items.length, id).toBeGreaterThanOrEqual(3)
      expect(faq.items.length, id).toBeLessThanOrEqual(5)
      for (const { question, answer } of faq.items) {
        expect(question.trim().endsWith('?'), question).toBe(true)
        expect(answer.split(/\s+/).length, question).toBeGreaterThanOrEqual(8)
      }
      const questions = faq.items.map(
        (item: { question: string }) => item.question,
      )
      expect(new Set(questions).size).toBe(questions.length)
    }
  })

  it('states no tax rates or percentages in service copy', () => {
    const hits = strings(services).filter(([, v]) => /\d\s*%/.test(v))
    expect(hits).toEqual([])
  })

  it('uses descriptive process headings instead of slogans', () => {
    for (const id of SERVICE_IDS) {
      expect(services.items[id].processTitle, id).toMatch(/^(Kako|How) /)
    }
  })

  it('has an Ilidža location block built only from confirmed facts', () => {
    const { title, body } = pages.contact.location
    expect(title).toContain('Ibrahima Ljubovića 47')
    expect(title).toMatch(/Ilidž/)
    const words = body.trim().split(/\s+/).length
    expect(words).toBeGreaterThanOrEqual(120)
    expect(words).toBeLessThanOrEqual(200)
    expect(body).toContain(ADDRESS)
    expect(body).toContain('061 221 368')
    expect(body).toContain('klijenti@starthn.ba')
    expect(body).toContain('08:00')
    // No neighbourhood lists, transit or parking claims (owner facts pending).
    expect(body).not.toMatch(
      /Hrasnic|Sokolovi|Butmir|Otes|Stup|Novi Grad|Hadžić|tramvaj|tram\b|parking|autobus|\bbus\b/i,
    )
    expect(seo.pages.contact.title.length).toBeLessThanOrEqual(60)
  })

  it('points every hero slide at the free-consultation CTA', () => {
    const slides = landing.hero.slides as Array<{ cta: string; href: string }>
    for (const slide of slides) {
      expect(slide.href).toBe('/contact')
      expect(slide.cta).toBe(landing.hero.cta.primary)
    }
  })

  it('replaces the hours stat with the Google rating', () => {
    const items = landing.stats.items as Record<
      string,
      { value: number; suffix: string; description: string }
    >
    for (const item of Object.values(items)) {
      expect(item.value).toBeLessThan(1000)
    }
    expect(items.hours.value).toBe(5)
    expect(items.hours.suffix).toBe('★')
    // The count comes from GOOGLE_REVIEW_COUNT (StatsSection), in plural forms.
    const hours = items.hours as unknown as Record<string, string>
    expect(hours.description).toBeUndefined()
    expect(hours.description_other).toContain('{{count}}')
  })

  it('does not caption the KPMG badge as a forensic credential', () => {
    const certificates = strings(pages.certificates)
    expect(certificates.filter(([, v]) => /forenzi|forensic/i.test(v))).toEqual(
      [],
    )
    const kpmg = pages.certificates.gallery.items.find(
      (item: { image: string }) => item.image.includes('kpmg'),
    )
    expect(kpmg.title).toContain('KPMG')
  })

  it('claims one certified accountant, not a certified team', () => {
    const scoped = [
      ...strings(pages.certificates),
      ...strings(pages.contact),
      ...strings(landing),
    ]
    expect(
      scoped.filter(([, v]) =>
        /Certificirani računovođe|certificiranim timom|certified accountants|certified team/i.test(
          v,
        ),
      ),
    ).toEqual([])
  })

  it('frames careers as an open application without dates', () => {
    const careers: Array<[string, string]> = [
      ...strings(pages.careers),
      ['seo', seo.pages.careers.description],
    ]
    expect(
      careers.filter(([, v]) =>
        /otvorene pozicije|otvorena mjesta|otvorena radna mjesta|open positions|open roles|rok za prijavu|deadline:/i.test(
          v,
        ),
      ),
    ).toEqual([])
    expect(pages.careers.jobs.title).toMatch(
      /Otvorena prijava|Open application/,
    )
  })

  it('promises the same response time everywhere', () => {
    expect(pages.contact.form.success).not.toMatch(/24|48/)
  })

  it('shows the post count without a grammatical number clash', () => {
    expect(pages.blog.index.filters.postsInView).not.toMatch(
      /\{\{count\}\} objava/,
    )
  })
})

describe('en-US wording', () => {
  const en = PUBLIC_NAMESPACES.flatMap((ns) =>
    strings(read('en-US', ns)).map(([k, v]) => [`${ns}:${k}`, v] as const),
  )

  it('has no machine-translation leftovers', () => {
    const hits = en.filter(([, v]) =>
      /\bcrafts?\b|VAT evidence|tax evidence|\d\.\d{3}\+|\d+\.00 KM|Federation of BiH/i.test(
        v,
      ),
    )
    expect(hits).toEqual([])
  })

  it('introduces FBiH before using the abbreviation on each service page', () => {
    const services = read('en-US', 'services')
    for (const id of SERVICE_IDS) {
      const item = services.items[id]
      const text = [
        item.heroTitle,
        item.heroDescription,
        item.localContextTitle,
        item.localContext,
      ]
        .filter(Boolean)
        .join(' ')
      const first = text.search(/\bFBiH\b/)
      if (first === -1) continue
      expect(text.slice(0, first + 5), id).toMatch(
        /Federation of Bosnia and Herzegovina \(FBiH\)$/,
      )
    }
  })

  it('names Bosnia and Herzegovina in every service H1', () => {
    const services = read('en-US', 'services')
    for (const id of SERVICE_IDS) {
      expect(services.items[id].heroTitle, id).toContain(
        'Bosnia and Herzegovina',
      )
    }
  })
})
