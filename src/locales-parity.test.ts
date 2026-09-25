// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
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
      const target = flatten(load(locale, ns))
      const src = source[ns]

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

    it('writes the brand literally wherever en-US does', () => {
      const offenders: string[] = []
      for (const ns of NAMESPACES) {
        const target = flatten(load(locale, ns))
        for (const [k, v] of Object.entries(source[ns])) {
          if (typeof v !== 'string' || !v.includes('Start HN')) continue
          const t = target[k]
          if (typeof t !== 'string' || !t.includes('Start HN')) offenders.push(`${ns}:${k}`)
        }
      }
      expect(offenders).toEqual([])
    })
  })
})
