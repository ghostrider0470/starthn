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

  it('shows the same contact CTA and tap-to-call on every slide (no stray logo)', () => {
    const html = renderHero(landing)
    const cta = (landing as unknown as { hero: { cta: { primary: string } } })
      .hero.cta.primary

    // One static CTA row outside the rotating slides.
    const contactLinks = html.match(/<a[^>]*href="\/bs-BA\/contact"[^>]*>/g) ?? []
    expect(contactLinks).toHaveLength(1)
    expect(html).toContain(cta)
    expect(html.match(/href="tel:\+38761221368"/g)).toHaveLength(1)
    expect(html).not.toContain('/logo-128.webp')

    // Nothing focusable inside the slides hidden from assistive tech.
    const hiddenSlides =
      html.match(/<div[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/div>/g) ?? []
    for (const slide of hiddenSlides) {
      expect(slide).not.toMatch(/<(a|button)\b/)
    }
  })

  it('shows the Google rating next to the CTA, linked to the profile', () => {
    const html = renderHero(landing)
    expect(html).toContain('href="https://maps.google.com/?cid=6152645102359996777"')
    expect(html).toMatch(/5,0\s*<span aria-hidden="true"[^>]*>★<\/span>\s*na Googleu \(19 recenzija\)/)
  })

  it('gives the H1 22-24px on phones and 44px carousel controls above the bottom nav', () => {
    const html = renderHero(landing)
    const h1 = html.match(/<h1\b[^>]*>/)?.[0] ?? ''
    expect(h1).toContain('text-[1.375rem]')
    expect(h1).toContain('sm:text-2xl')

    const pause = html.match(/<button[^>]*aria-pressed[^>]*>/)?.[0] ?? ''
    expect(pause).toContain('h-11')
    expect(pause).toContain('w-11')

    // Controls and content clear the fixed bottom nav incl. the safe area.
    expect(html).toContain('pb-[calc(6rem+env(safe-area-inset-bottom))]')
    expect(html).toContain('pb-[calc(9.5rem+env(safe-area-inset-bottom))]')
  })

  it('puts the pause button first, clear of the chat launcher, on narrow phones', () => {
    const html = renderHero(landing)
    const controls = html.slice(html.indexOf('aria-pressed'))

    // Pause comes before prev/dots/next in DOM (= visual and focus order), at
    // the inline start, away from the launcher at the inline end.
    const pauseAt = html.indexOf('aria-pressed')
    expect(pauseAt).toBeGreaterThan(-1)
    expect(pauseAt).toBeLessThan(html.indexOf('aria-label="Prethodni slajd"'))
    expect(html).toContain('flex items-center justify-start gap-2 md:justify-center')

    // Phone widths: 44 (pause) + 8 + 44 + 4 + 3 x 24 (dots) + 4 + 44 = 220px,
    // which fits 320px minus the 2 x 16px gutter and ends left of the
    // launcher (x >= 240 at 320px).
    const dots = controls.match(/<button[^>]*role="tab"[^>]*>/g) ?? []
    expect(dots).toHaveLength(hero.slides.length)
    for (const dot of dots) expect(dot).toMatch(/\bw-6\b/)

    // The visual counter is md-only; the live region stays for AT.
    expect(html).toMatch(/<span class="sr-only" aria-live="off">1 \/ 3<\/span>/)

    // The launcher steps aside for the controls and the CTAs if they meet it.
    const avoid = html.match(/<[a-z]+\b[^>]*data-chat-launcher-avoid=""[^>]*>/g) ?? []
    expect(avoid).toHaveLength(5) // primary CTA, call, rating, pause, arrows+dots
    expect(avoid.some((tag) => tag.includes('href="tel:'))).toBe(true)
    expect(avoid.some((tag) => tag.includes('aria-pressed'))).toBe(true)
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
