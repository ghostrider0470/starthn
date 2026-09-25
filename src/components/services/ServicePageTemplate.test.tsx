import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  SERVICE_HERO_IMAGE_SIZES,
  ServicePageTemplate,
} from './ServicePageTemplate'
import type { ServiceId } from '@/lib/service-routes'
import i18n from '@/i18n'
import { SERVICE_IDS } from '@/lib/service-routes'

let pathname = '/bs-BA/services/bookkeeping-accounting'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname }),
}))

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), `public/locales/${locale}/${ns}.json`), 'utf8'),
  ) as Record<string, unknown>
}

type ServicesBundle = {
  related: { title: string; postsTitle: string; postLabels: Record<string, string> }
  items: Record<
    string,
    {
      title: string
      heroTitle: string
      interiorAlt: string
      localContextTitle: string
      localContext: string
      related: Array<string>
      relatedPosts: Array<string>
    }
  >
}

function renderService(
  locale: string,
  path: string,
  serviceId: ServiceId = 'bookkeeping',
) {
  pathname = path
  const instance = i18n.cloneInstance({ lng: locale, initAsync: false })
  return renderToString(
    <I18nextProvider i18n={instance}>
      <ServicePageTemplate serviceId={serviceId} />
    </I18nextProvider>,
  )
}

describe('ServicePageTemplate SSR', () => {
  const services = readBundle('bs-BA', 'services') as unknown as ServicesBundle
  const bookkeeping = services.items.bookkeeping
  const bookkeepingFull = bookkeeping as unknown as {
    pricing: { title: string; plans: Array<{ price: string }> }
    faq: { items: Array<{ question: string; answer: string }> }
  }

  beforeAll(() => {
    for (const locale of ['bs-BA', 'de-DE']) {
      for (const ns of ['common', 'services']) {
        i18n.addResourceBundle(locale, ns, readBundle(locale, ns), true, true)
      }
    }
  })

  it('renders the search-oriented H1 and the local-context section', () => {
    const html = renderService('bs-BA', '/bs-BA/services/bookkeeping-accounting')

    const h1s = html.match(/<h1\b[\s\S]*?<\/h1>/g) ?? []
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toContain(bookkeeping.heroTitle)

    expect(html).toContain(bookkeeping.localContextTitle)
    expect(html).toContain(bookkeeping.localContext)
  })

  it('links related services and posts with descriptive anchors', () => {
    const html = renderService('bs-BA', '/bs-BA/services/bookkeeping-accounting')

    expect(html).toContain(services.related.title)
    expect(html).toContain('href="/bs-BA/services/tax-consulting"')
    expect(html).toContain(services.items.taxConsulting.title)
    expect(html).toContain('href="/bs-BA/services/financial-reporting"')

    for (const slug of bookkeeping.relatedPosts) {
      expect(html).toContain(`href="/bs-BA/blog/${slug}"`)
      expect(html).toContain(services.related.postLabels[slug])
    }
  })

  it('loads the hero photo eagerly at high priority with a responsive srcset', () => {
    const html = renderService('bs-BA', '/bs-BA/services/bookkeeping-accounting')

    const images = html.match(/<img\b[^>]*>/g) ?? []
    expect(images.length).toBeGreaterThanOrEqual(2)
    const hero = images.find((tag) => tag.includes('bookkeeping-hero'))!
    expect(hero).toContain('loading="eager"')
    expect(hero).toMatch(/fetchpriority="high"/i)
    expect(hero).toContain('width="1280"')
    expect(hero).toContain('height="853"')
    expect(hero).toContain('/pages/bookkeeping-hero-640.webp 640w')
    expect(hero).toContain('/pages/bookkeeping-hero-960.webp 960w')
    expect(hero).toContain('/pages/bookkeeping-hero-1280.webp 1280w')
    expect(hero).toContain(`sizes="${SERVICE_HERO_IMAGE_SIZES}"`)

    // Everything below the hero stays lazy.
    const interior = images.find((tag) => tag.includes('bookkeeping-interior'))!
    expect(interior).toContain('loading="lazy"')
    expect(interior).not.toMatch(/fetchpriority/i)
    expect(html).toContain(`alt="${bookkeeping.interiorAlt}"`)
  })

  it('ships every hero variant it references', () => {
    for (const id of SERVICE_IDS) {
      const html = renderService('bs-BA', '/bs-BA/services/x', id)
      const hero = (html.match(/<img\b[^>]*>/g) ?? []).find((tag) =>
        tag.includes('-hero-'),
      )!
      const files = [...hero.matchAll(/\/pages\/[\w-]+-hero-\d+\.webp/g)].map(
        (m) => m[0],
      )
      expect(files.length).toBeGreaterThanOrEqual(3)
      for (const file of files) {
        expect(existsSync(resolve(process.cwd(), `public${file}`))).toBe(true)
      }
    }
  })

  it('offers tap-to-call and the Google rating under the hero CTAs', () => {
    const html = renderService('bs-BA', '/bs-BA/services/bookkeeping-accounting')

    expect(html).toContain('href="tel:+38761221368"')
    expect(html).toContain('Pozovi 061 221 368')
    expect(html).toContain('href="https://maps.google.com/?cid=6152645102359996777"')
    expect(html).toMatch(/5,0\s*<span aria-hidden="true"[^>]*>★<\/span>\s*na Googleu \(19 recenzija\)/)
    // No review markup of any kind.
    expect(html).not.toMatch(/AggregateRating|itemprop|itemscope/)
  })

  it('shows the published prices, the payroll anchor and a visible FAQ on bookkeeping', () => {
    const html = renderService('bs-BA', '/bs-BA/services/bookkeeping-accounting')
    const pricing = bookkeepingFull.pricing

    expect(html).toContain('id="cijene"')
    expect(html).toContain(pricing.title)
    for (const plan of pricing.plans) expect(html).toContain(plan.price)
    expect(html).toContain('Zatražite ponudu')

    expect(html).toMatch(/<section[^>]*id="obracun-plata"/)
    expect(html).toMatch(/<h2[^>]*>Obračun plata i doprinosa<\/h2>/)

    // FAQ: every question is an H3 with its answer in the SSR HTML.
    for (const item of bookkeepingFull.faq.items) {
      expect(html).toContain(`>${item.question}</h3>`)
      expect(html).toContain(item.answer)
    }
    expect(html).not.toContain('FAQPage')
    expect(html).not.toContain('<details')
    expect(html).toContain('id="faq"')
  })

  it('does not nest a second <main> inside the root layout', () => {
    const html = renderService('bs-BA', '/bs-BA/services/bookkeeping-accounting')
    expect(html).not.toContain('<main')
  })

  it('never renders raw translation keys in a locale without the new keys', () => {
    const html = renderService('de-DE', '/de-DE/services/bookkeeping-accounting')

    expect(html).not.toMatch(/\bsections\.(overview|scope|process|outputs)\b/)
    expect(html).not.toMatch(/\brelated\.(title|postsTitle|postLabels)\b/)
    expect(html).not.toContain('items.')
    expect(html).not.toMatch(/contactActions\.|trust\.rating|common\.(faqOverline|pricingOverline|requestQuote|quoteNote)/)
    // The call button still works, with the international number.
    expect(html).toContain('href="tel:+38761221368"')
  })
})
