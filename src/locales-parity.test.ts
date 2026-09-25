// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Structural parity for every locale folder, including the 13 locales that
 * stay reachable but are noindexed. i18next loads only the current locale
 * (load: 'currentOnly'), so a key missing from any folder would render as a
 * raw key there. Content rules for the indexable locales live in
 * locales-seo-common.test.ts and locales-content.test.ts.
 */
const SOURCE_LOCALE = 'en-US'
const LOCALES_DIR = join(process.cwd(), 'public', 'locales')

const LOCALES = readdirSync(LOCALES_DIR).filter((d) =>
  statSync(join(LOCALES_DIR, d)).isDirectory(),
)
const NAMESPACES = readdirSync(join(LOCALES_DIR, SOURCE_LOCALE))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))

type Leaf = string | number | boolean | null

function load(locale: string, ns: string): unknown {
  return JSON.parse(readFileSync(join(LOCALES_DIR, locale, `${ns}.json`), 'utf8'))
}

/** Flattens to path -> leaf; arrays also record their length. */
function flatten(
  value: unknown,
  prefix = '',
  out: Record<string, Leaf> = {},
): Record<string, Leaf> {
  if (Array.isArray(value)) {
    out[`${prefix}#length`] = value.length
    value.forEach((v, i) => flatten(v, `${prefix}.${i}`, out))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out)
    }
  } else {
    out[prefix] = value as Leaf
  }
  return out
}

function placeholders(value: Leaf): string {
  if (typeof value !== 'string') return ''
  return (value.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? [])
    .map((p) => p.replace(/\s/g, ''))
    .sort()
    .join(',')
}

/**
 * i18next plural keys (`key_one`, `key_few`, `key_other`, …) legitimately
 * differ per language, so they are compared by base key. A base is plural
 * when the bundle has `<base>_other`.
 */
const PLURAL_SUFFIX = /^(.*)_(zero|one|two|few|many|other)$/

function splitPlurals(flat: Record<string, Leaf>) {
  const plain: Record<string, Leaf> = {}
  const plural: Record<string, Record<string, Leaf>> = {}
  for (const [key, value] of Object.entries(flat)) {
    const match = PLURAL_SUFFIX.exec(key)
    if (match && `${match[1]}_other` in flat) {
      plural[match[1]] ??= {}
      plural[match[1]][match[2]] = value
    } else {
      plain[key] = value
    }
  }
  return { plain, plural }
}

/**
 * Plural categories i18next can pick for this locale (Intl.PluralRules for
 * counts 0-200, plus `other`), and the categories the locale has at all.
 */
function pluralCategories(locale: string) {
  const rules = new Intl.PluralRules(locale)
  const required = new Set<string>(['other'])
  for (let n = 0; n <= 200; n++) required.add(rules.select(n))
  const allowed = new Set<string>(rules.resolvedOptions().pluralCategories)
  return { required, allowed }
}

/** Old address, old phone, old public email, retired claims. */
const FORBIDDEN =
  /vilson|wilson|ويلسون|ウィルソン|윌슨|CRP Inkubator|share\.google|info@starthn\.ba|135[\s/-]?377/i

const source: Record<string, Record<string, Leaf>> = Object.fromEntries(
  NAMESPACES.map((ns) => [ns, flatten(load(SOURCE_LOCALE, ns))]),
)

describe('locale parity with en-US', () => {
  it('has 16 locale folders', () => {
    expect(LOCALES).toHaveLength(16)
  })

  describe.each(LOCALES.filter((l) => l !== SOURCE_LOCALE))('%s', (locale) => {
    it.each(NAMESPACES)('%s.json has the same keys, array lengths and placeholders', (ns) => {
      const targetSplit = splitPlurals(flatten(load(locale, ns)))
      const sourceSplit = splitPlurals(source[ns])
      const target = targetSplit.plain
      const src = sourceSplit.plain

      // Plural groups: same bases as en-US, the forms this locale needs, and
      // the same placeholders in every form.
      expect(Object.keys(targetSplit.plural).sort(), `plural keys in ${locale}/${ns}`).toEqual(
        Object.keys(sourceSplit.plural).sort(),
      )
      const { required, allowed } = pluralCategories(locale)
      for (const [base, forms] of Object.entries(targetSplit.plural)) {
        const have = Object.keys(forms)
        expect(
          [...required].filter((c) => !have.includes(c)),
          `${locale}/${ns}:${base} is missing plural forms`,
        ).toEqual([])
        expect(
          have.filter((c) => !allowed.has(c)),
          `${locale}/${ns}:${base} has plural forms this language does not use`,
        ).toEqual([])
        const expected = Object.hasOwn(sourceSplit.plural, base)
          ? placeholders(sourceSplit.plural[base].other)
          : ''
        for (const [form, value] of Object.entries(forms)) {
          expect(placeholders(value), `${locale}/${ns}:${base}_${form}`).toBe(expected)
        }
      }

      const missing = Object.keys(src).filter((k) => !(k in target))
      const extra = Object.keys(target).filter((k) => !(k in src))
      expect(missing, `missing in ${locale}/${ns}`).toEqual([])
      expect(extra, `not in en-US ${ns}`).toEqual([])

      const lengthMismatch = Object.keys(src).filter(
        (k) => k.endsWith('#length') && src[k] !== target[k],
      )
      expect(lengthMismatch).toEqual([])

      const placeholderMismatch = Object.keys(src).filter(
        (k) => placeholders(src[k]) !== placeholders(target[k]),
      )
      expect(placeholderMismatch).toEqual([])

      const typeMismatch = Object.keys(src).filter(
        (k) => k in target && typeof src[k] !== typeof target[k],
      )
      expect(typeMismatch).toEqual([])
    })

    it('contains no retired address, phone, email or claims', () => {
      for (const ns of NAMESPACES) {
        const hits = Object.entries(flatten(load(locale, ns))).filter(
          ([, v]) => typeof v === 'string' && FORBIDDEN.test(v),
        )
        expect(hits, `${locale}/${ns}`).toEqual([])
      }
    })

    it('keeps service related/relatedPosts ids identical to en-US', () => {
      const target = flatten(load(locale, 'services'))
      const idKeys = Object.keys(source.services).filter((k) =>
        /^items\.[^.]+\.(related|relatedPosts)(\.|#)/.test(k),
      )
      expect(idKeys.length).toBeGreaterThan(0)
      for (const k of idKeys) expect(target[k], k).toEqual(source.services[k])
    })

    it('keeps locale-neutral values (links, stat numbers, images) identical to en-US', () => {
      // These are data, not copy: a stale value here would send one locale
      // to another page or show a retired stat.
      const NEUTRAL: Record<string, RegExp> = {
        landing: /^(hero\.slides\.\d+\.href|stats\.items\.[^.]+\.(value|suffix))$/,
        pages: /^certificates\.gallery\.items\.\d+\.image$/,
      }
      for (const [ns, pattern] of Object.entries(NEUTRAL)) {
        const target = flatten(load(locale, ns))
        const keys = Object.keys(source[ns]).filter((k) => pattern.test(k))
        expect(keys.length, `${ns} neutral keys`).toBeGreaterThan(0)
        const drift = keys.filter((k) => target[k] !== source[ns][k])
        expect(drift, `${locale}/${ns}`).toEqual([])
      }
    })

    it('writes the brand literally wherever en-US does', () => {
      const offenders: Array<string> = []
      for (const ns of NAMESPACES) {
        const target = flatten(load(locale, ns))
        for (const [k, v] of Object.entries(source[ns])) {
          if (typeof v !== 'string' || !v.includes('Start HN')) continue
          // A plural form en-US has but this language lacks: check `_other`.
          const pluralBase = PLURAL_SUFFIX.exec(k)?.[1]
          const t =
            !(k in target) && pluralBase ? target[`${pluralBase}_other`] : target[k]
          if (typeof t !== 'string' || !t.includes('Start HN')) offenders.push(`${ns}:${k}`)
        }
      }
      expect(offenders).toEqual([])
    })
  })
})
