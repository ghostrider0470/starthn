import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInstance } from 'i18next'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { HeroSection } from './HeroSection'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/bs-BA' }),
}))

type Landing = {
  hero: { h1: string; intro: string; slides: Array<{ title: string }> }
}

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), `public/locales/${locale}/${ns}.json`), 'utf8'),
  ) as Record<string, unknown>
}

function renderHero(landing: Record<string, unknown>) {
  const i18n = createInstance()
  void i18n.init({
    lng: 'bs-BA',
    fallbackLng: false,
    ns: ['landing', 'common'],
    defaultNS: 'common',
    resources: { 'bs-BA': { landing, common: readBundle('bs-BA', 'common') } },
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <HeroSection />
    </I18nextProvider>,
  )
}

describe('HeroSection SSR', () => {
  const landing = readBundle('bs-BA', 'landing')
  const { hero } = landing as unknown as Landing

  it('renders one static H1 and intro outside the slides', () => {
    const html = renderHero(landing)

    const h1s = html.match(/<h1\b[\s\S]*?<\/h1>/g) ?? []
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toContain(hero.h1)
    expect(html).toContain(hero.intro)

    // Slide titles are still rendered, but as paragraphs.
    for (const slide of hero.slides) {
      expect(html).toContain(`>${slide.title}</p>`)
    }
  })

  it('server-renders only the first slide photo', () => {
    const html = renderHero(landing)
    const photos = (html.match(/<img\b[^>]*>/g) ?? []).filter((tag) =>
      tag.includes('/hero/'),
    )

    expect(photos).toHaveLength(1)
    expect(photos[0]).toContain('/hero/slide-3-1440.webp')
  })

  it('localizes the carousel controls', () => {
    const html = renderHero(landing)

    expect(html).toContain('aria-label="Prethodni slajd"')
    expect(html).toContain('aria-label="Sljedeći slajd"')
    expect(html).not.toContain('Previous slide')
  })

  it('falls back to the first slide title when a locale has no hero.h1 yet', () => {
    const withoutH1 = JSON.parse(JSON.stringify(landing)) as Landing
    delete (withoutH1.hero as Partial<Landing['hero']>).h1
    delete (withoutH1.hero as Partial<Landing['hero']>).intro

    const html = renderHero(withoutH1 as unknown as Record<string, unknown>)
    const h1 = html.match(/<h1\b[\s\S]*?<\/h1>/)?.[0] ?? ''

    expect(h1).toContain(hero.slides[0].title)
    expect(html).not.toContain('hero.h1')
    expect(html).not.toContain('hero.intro')
  })
})
