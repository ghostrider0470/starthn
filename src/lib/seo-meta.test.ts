// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  SEO_PAGE_KEY,
  localizedPageHead,
  localizedServiceHead,
  mergeSeoFallback,
  resolveSeoStrings,
  seoFallbackChain,
  seoFallbackLocale,
} from './seo-meta'
import { SEO_ORIGIN, SEO_PRIORITY_LOCALES } from './seo'
import i18n from '@/i18n'

const LOCALES_DIR = join(process.cwd(), 'public', 'locales')

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(LOCALES_DIR, locale, `${ns}.json`), 'utf8'))
}

/** Every page with a localized head, plus the 404 title. */
const PAGE_KEYS = [...new Set([...Object.values(SEO_PAGE_KEY), 'notFound'])]

beforeAll(() => {
  for (const locale of SEO_PRIORITY_LOCALES) {
    i18n.addResourceBundle(locale, 'seo', readBundle(locale, 'seo'), true, true)
    i18n.addResourceBundle(locale, 'services', readBundle(locale, 'services'), true, true)
  }
})

describe('SEO strings of the indexable locales', () => {
  for (const locale of SEO_PRIORITY_LOCALES) {
    describe(locale, () => {
      for (const pageKey of PAGE_KEYS) {
        it(`${pageKey}: branded title ≤60 chars, description 70–160 chars`, () => {
          const { title, description } = resolveSeoStrings(pageKey, locale)
          // The page's own strings, not a fallback
          expect(title).toBe(
            i18n.getResource(locale, 'seo', `pages.${pageKey}.title`),
          )
          expect(title).toContain('Start HN')
          expect(title.length).toBeLessThanOrEqual(60)
          expect(description.length).toBeGreaterThanOrEqual(70)
          expect(description.length).toBeLessThanOrEqual(160)
          expect(title.startsWith('pages.')).toBe(false)
          expect(description.startsWith('pages.')).toBe(false)
        })
      }

      it('has a unique title per page', () => {
        const titles = PAGE_KEYS.map((key) => resolveSeoStrings(key, locale).title)
        expect(new Set(titles).size).toBe(titles.length)
      })
    })
  }
})

describe('fallbacks', () => {
  it('picks bs-BA for Bosnian, Croatian and Serbian, en-US for the rest', () => {
    expect(seoFallbackLocale('hr-HR')).toBe('bs-BA')
    expect(seoFallbackLocale('sr-Latn')).toBe('bs-BA')
    expect(seoFallbackLocale('bs-BA')).toBe('bs-BA')
    expect(seoFallbackLocale('de-DE')).toBe('en-US')
    expect(seoFallbackLocale('zh-Hans')).toBe('en-US')
    expect(seoFallbackChain('de-DE')).toEqual(['de-DE', 'en-US', 'bs-BA'])
    expect(seoFallbackChain('bs-BA')).toEqual(['bs-BA'])
  })

  it('falls back to en-US for a non-Balkan locale missing a key', () => {
    i18n.addResourceBundle(
      'fr-FR',
      'seo',
      { pages: { about: { title: 'À propos | Start HN', description: 'Description française' } } },
      true,
      true,
    )
    expect(resolveSeoStrings('about', 'fr-FR').title).toBe('À propos | Start HN')
    expect(resolveSeoStrings('serviceVirtualCfo', 'fr-FR')).toEqual(
      resolveSeoStrings('serviceVirtualCfo', 'en-US'),
    )
  })

  it('falls back to bs-BA for Serbian', () => {
    expect(resolveSeoStrings('contact', 'sr-Latn')).toEqual(
      resolveSeoStrings('contact', 'bs-BA'),
    )
  })

  it('uses the default locale for an unknown locale param', () => {
    expect(resolveSeoStrings('home', undefined)).toEqual(resolveSeoStrings('home', 'bs-BA'))
    expect(resolveSeoStrings('home', 'xx-XX')).toEqual(resolveSeoStrings('home', 'bs-BA'))
  })

  it('never returns a raw key', () => {
    const unknownPage = resolveSeoStrings('noSuchPage', 'ko-KR')
    expect(unknownPage.title).not.toMatch(/^(pages|default)\./)
    expect(unknownPage.title).toContain('Start HN')
    const nothingLoaded = resolveSeoStrings('noSuchPage', 'ja-JP')
    expect(nothingLoaded.title).not.toMatch(/^(pages|default)\./)
    expect(nothingLoaded.description).not.toMatch(/^(pages|default)\./)
  })

  it('mergeSeoFallback fills only the missing keys, with cloned objects', () => {
    i18n.addResourceBundle(
      'it-IT',
      'seo',
      { pages: { about: { title: 'Chi siamo | Start HN', description: 'Descrizione italiana' } } },
      true,
      true,
    )
    mergeSeoFallback('it-IT')

    // Own string kept, missing strings copied from en-US
    expect(i18n.getResource('it-IT', 'seo', 'pages.about.title')).toBe('Chi siamo | Start HN')
    const enTitle = i18n.getResource('en-US', 'seo', 'pages.serviceBookkeeping.title')
    expect(i18n.getResource('it-IT', 'seo', 'pages.serviceBookkeeping.title')).toBe(enTitle)

    // The page locale's store alone now answers (as on the client after hydration)
    const itBundle = i18n.getResourceBundle('it-IT', 'seo') as {
      pages: Record<string, { title: string }>
    }
    itBundle.pages.serviceBookkeeping.title = 'changed'
    expect(i18n.getResource('en-US', 'seo', 'pages.serviceBookkeeping.title')).toBe(enTitle)
  })
})

describe('localizedPageHead', () => {
  it('emits title, description, Open Graph and Twitter strings', () => {
    const { title, description } = resolveSeoStrings('about', 'bs-BA')
    expect(localizedPageHead('about', 'bs-BA')).toEqual({
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
    })
  })

  it('adds robots only when asked', () => {
    const { meta } = localizedPageHead('privacy', 'hr-HR', { robots: 'noindex,follow' })
    expect(meta.at(-1)).toEqual({ name: 'robots', content: 'noindex,follow' })
  })

  it('differs per locale', () => {
    const titles = SEO_PRIORITY_LOCALES.map(
      (locale) => (localizedPageHead('services', locale).meta[0] as { title: string }).title,
    )
    expect(new Set(titles).size).toBe(SEO_PRIORITY_LOCALES.length)
  })
})

describe('localizedServiceHead', () => {
  it('adds Service JSON-LD named from the services namespace', () => {
    const head = localizedServiceHead('bookkeeping', 'bs-BA')
    expect(head.meta[0]).toEqual({
      title: resolveSeoStrings('serviceBookkeeping', 'bs-BA').title,
    })
    const data = JSON.parse(head.scripts[0].children)
    expect(head.scripts[0].type).toBe('application/ld+json')
    expect(data['@type']).toBe('Service')
    expect(data.name).toBe(i18n.getResource('bs-BA', 'services', 'items.bookkeeping.title'))
    expect(data.description).toBe(
      i18n.getResource('bs-BA', 'services', 'items.bookkeeping.shortDescription'),
    )
    expect(data['@id']).toBe(`${SEO_ORIGIN}/bs-BA/services/bookkeeping-accounting#service`)
    expect(data.inLanguage).toBe('bs-BA')
  })
})
