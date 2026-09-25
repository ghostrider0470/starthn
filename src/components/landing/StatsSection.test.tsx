import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { StatsSection } from './StatsSection'
import type { ReactNode } from 'react'
import i18n from '@/i18n'
import { GOOGLE_REVIEW_COUNT } from '@/lib/business'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/bs-BA' }),
}))

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), `public/locales/${locale}/${ns}.json`),
      'utf8',
    ),
  ) as Record<string, unknown>
}

type StatItem = { value: number; suffix: string; label: string }

function render(locale: string, landing: Record<string, unknown>) {
  i18n.addResourceBundle(locale, 'landing', landing, true, true)
  const instance = i18n.cloneInstance({ lng: locale, initAsync: false })
  return renderToString(
    <I18nextProvider i18n={instance}>
      <StatsSection />
    </I18nextProvider>,
  )
}

beforeAll(() => {
  for (const locale of ['bs-BA', 'en-US']) {
    i18n.addResourceBundle(
      locale,
      'common',
      readBundle(locale, 'common'),
      true,
      true,
    )
  }
})

describe('StatsSection', () => {
  it('shows the Google rating (from the business constants) instead of "1.000+ sati"', () => {
    const landing = readBundle('bs-BA', 'landing')
    const hours = (landing as { stats: { items: Record<string, StatItem> } })
      .stats.items.hours
    // The locale replaced the hours stat with the rating.
    expect(hours.suffix).toBe('★')

    const html = render('bs-BA', landing)
    expect(html).toContain(hours.label)
    expect(html).toMatch(/5,0<span aria-hidden="true"[^>]*>★<\/span>/)
    expect(html).not.toContain('1.000')
  })

  it('takes the review count from GOOGLE_REVIEW_COUNT, in the right plural form', () => {
    const bs = render('bs-BA', readBundle('bs-BA', 'landing'))
    expect(bs).toContain(
      `Prosječna ocjena naših klijenata na Google profilu agencije (${GOOGLE_REVIEW_COUNT} recenzija).`,
    )
    const en = render('en-US', readBundle('en-US', 'landing'))
    expect(en).toContain(
      `Average rating from ${GOOGLE_REVIEW_COUNT} client reviews on our Google Business Profile.`,
    )
    expect(bs).not.toContain('{{count}}')
    expect(bs).not.toContain('stats.items')
  })

  it('never hard-codes the review count in any locale', () => {
    const locales = readdirSync(resolve(process.cwd(), 'public/locales'))
    expect(locales).toHaveLength(16)
    for (const locale of locales) {
      const landing = readBundle(locale, 'landing') as {
        stats: { items: { hours: Record<string, unknown> } }
      }
      const hours = landing.stats.items.hours
      const texts = Object.entries(hours)
        .filter(([key]) => key.startsWith('description'))
        .map(([, value]) => String(value))
      expect(texts.length, locale).toBeGreaterThan(0)
      expect(hours.description, locale).toBeUndefined()
      for (const text of texts) {
        expect(text, locale).toContain('{{count}}')
        expect(text, locale).not.toMatch(/\d/)
      }
      expect(hours.description_other, locale).toBeTypeOf('string')
    }
  })

  it('formats the rating for the page locale', () => {
    const html = render('en-US', readBundle('en-US', 'landing'))
    expect(html).toMatch(/5\.0<span aria-hidden="true"[^>]*>★<\/span>/)
  })
})
