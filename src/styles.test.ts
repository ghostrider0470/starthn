// @vitest-environment node
//
// Web fonts in src/styles.css: only the latin and latin-ext faces of the two
// variable fonts, plus metric-matched local fallbacks for the swap period.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(
  path.resolve(process.cwd(), 'src/styles.css'),
  'utf8',
)
const fontFaces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => m[1])

function descriptor(face: string, name: string): string | undefined {
  return new RegExp(`(?:^|;)\\s*${name}:\\s*([^;]+);`).exec(face)?.[1].trim()
}

function familyOf(face: string): string | undefined {
  return descriptor(face, 'font-family')?.replace(/['"]/g, '')
}

function percent(face: string, name: string): number {
  return Number.parseFloat(descriptor(face, name) ?? 'NaN') / 100
}

describe('web font faces', () => {
  const webFaces = fontFaces.filter((f) => /url\(/.test(f))

  it('does not import the fontsource index (cyrillic/vietnamese faces)', () => {
    expect(css).not.toMatch(/@import\s+['"]@fontsource/)
    expect(css).not.toMatch(/url\([^)]*(cyrillic|vietnamese)/)
  })

  it('declares latin and latin-ext for both families, from existing files', () => {
    const files = webFaces.map((f) => /url\('([^']+)'\)/.exec(f)?.[1] ?? '')
    expect(files.map((f) => path.basename(f)).sort()).toEqual([
      'plus-jakarta-sans-bcs-wght-normal.woff2',
      'plus-jakarta-sans-latin-ext-wght-normal.woff2',
      'plus-jakarta-sans-latin-wght-normal.woff2',
      'public-sans-bcs-wght-normal.woff2',
      'public-sans-latin-ext-wght-normal.woff2',
      'public-sans-latin-wght-normal.woff2',
    ])
    for (const file of files) {
      expect(
        fs.existsSync(path.resolve(process.cwd(), 'src', file)),
        file,
      ).toBe(true)
    }
    for (const face of webFaces) {
      expect(descriptor(face, 'font-display')).toBe('swap')
    }
  })

  /** Code points covered by a unicode-range descriptor. */
  function codePoints(range: string): Set<number> {
    const points = new Set<number>()
    for (const part of range.split(',')) {
      const [from, to = from] = part.trim().replace(/^U\+/i, '').split('-')
      for (let cp = parseInt(from, 16); cp <= parseInt(to, 16); cp++) {
        points.add(cp)
      }
    }
    return points
  }

  const BCS = [...'ČčĆćĐđŠšŽž'].map((c) => c.codePointAt(0)!)

  for (const family of ['Plus Jakarta Sans Variable', 'Public Sans Variable']) {
    it(`${family}: č ć đ š ž come from the small subset, the rest of latin-ext from the full file`, () => {
      const faces = webFaces.filter((f) => familyOf(f) === family)
      const subset = faces.find((f) => f.includes('-bcs-wght-normal.woff2'))!
      const latinExt = faces.find((f) => f.includes('-latin-ext-wght-normal'))!
      const subsetRange = codePoints(descriptor(subset, 'unicode-range')!)
      const extRange = codePoints(descriptor(latinExt, 'unicode-range')!)
      expect([...subsetRange].sort((a, b) => a - b)).toEqual(
        [...BCS].sort((a, b) => a - b),
      )
      // The ranges never overlap, so a Bosnian page never needs the big file.
      for (const cp of BCS)
        expect(extRange.has(cp), cp.toString(16)).toBe(false)
      // …and together they still cover the whole fontsource latin-ext range.
      for (let cp = 0x100; cp <= 0x2ba; cp++) {
        expect(subsetRange.has(cp) || extRange.has(cp), cp.toString(16)).toBe(
          true,
        )
      }
      expect(descriptor(subset, 'font-weight')).toBe(
        descriptor(latinExt, 'font-weight'),
      )
    })
  }

  it('ships subsets that really contain the Bosnian letters (and are small)', () => {
    for (const file of [
      'plus-jakarta-sans-bcs-wght-normal.woff2',
      'public-sans-bcs-wght-normal.woff2',
    ]) {
      const bytes = fs.readFileSync(
        path.resolve(process.cwd(), 'src/assets/fonts', file),
      )
      expect(bytes.subarray(0, 4).toString('latin1'), file).toBe('wOF2')
      expect(bytes.length, file).toBeLessThan(6000)
    }
  })
})

describe('metric-matched fallbacks', () => {
  const WEB_METRICS = {
    'Plus Jakarta Sans Fallback': { ascent: 1.038, descent: 0.222 },
    'Public Sans Fallback': { ascent: 0.95, descent: 0.225 },
  } as const

  for (const [family, metrics] of Object.entries(WEB_METRICS)) {
    const faces = fontFaces.filter((f) => familyOf(f) === family)

    it(`${family}: regular and bold faces over local Arial/Liberation/Roboto`, () => {
      expect(faces.map((f) => descriptor(f, 'font-weight'))).toEqual([
        '100 599',
        '600 900',
      ])
      for (const face of faces) {
        const src = descriptor(face, 'src') ?? ''
        expect(src).not.toMatch(/url\(/)
        expect(src).toMatch(/local\('Arial( Bold)?'\)/)
        expect(src).toMatch(/local\('Liberation Sans( Bold)?'\)/)
        expect(src).toMatch(/local\('Roboto( Bold)?'\)/)
      }
    })

    it(`${family}: overrides reproduce the web font's vertical metrics`, () => {
      for (const face of faces) {
        const sizeAdjust = percent(face, 'size-adjust')
        expect(sizeAdjust).toBeGreaterThan(0.95)
        expect(sizeAdjust).toBeLessThan(1.1)
        expect(percent(face, 'ascent-override') * sizeAdjust).toBeCloseTo(
          metrics.ascent,
          3,
        )
        expect(percent(face, 'descent-override') * sizeAdjust).toBeCloseTo(
          metrics.descent,
          3,
        )
        expect(descriptor(face, 'line-gap-override')).toBe('0%')
      }
    })
  }

  it('puts each fallback right after its web font in the font stacks', () => {
    const stacks = [...css.matchAll(/font-family:\s*([^;]+);/g)]
      .map((m) => m[1].split(',').map((s) => s.trim().replace(/['"]/g, '')))
      .filter((s) => s.length > 1)
    const body = stacks.find((s) => s[0] === 'Public Sans Variable')
    const heading = stacks.find((s) => s[0] === 'Plus Jakarta Sans Variable')
    expect(body?.slice(0, 3)).toEqual([
      'Public Sans Variable',
      'Public Sans',
      'Public Sans Fallback',
    ])
    expect(heading?.slice(0, 3)).toEqual([
      'Plus Jakarta Sans Variable',
      'Plus Jakarta Sans',
      'Plus Jakarta Sans Fallback',
    ])
  })
})
