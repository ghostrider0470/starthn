import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ServicePageTemplate } from './ServicePageTemplate'
import i18n from '@/i18n'

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

function renderService(locale: string, path: string) {
  pathname = path
  const instance = i18n.cloneInstance({ lng: locale, initAsync: false })
  return renderToString(
    <I18nextProvider i18n={instance}>
      <ServicePageTemplate serviceId="bookkeeping" />
    </I18nextProvider>,
  )
}

describe('ServicePageTemplate SSR', () => {
  const services = readBundle('bs-BA', 'services') as unknown as ServicesBundle
  const bookkeeping = services.items.bookkeeping

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

  it('lazy-loads the hero image and uses the descriptive interior alt', () => {
    const html = renderService('bs-BA', '/bs-BA/services/bookkeeping-accounting')

    const images = html.match(/<img\b[^>]*>/g) ?? []
    expect(images.length).toBeGreaterThanOrEqual(2)
    for (const image of images) {
      expect(image).toContain('loading="lazy"')
      expect(image).not.toMatch(/fetchpriority/i)
    }
    expect(html).toContain(`alt="${bookkeeping.interiorAlt}"`)
  })

  it('never renders raw translation keys in a locale without the new keys', () => {
    const html = renderService('de-DE', '/de-DE/services/bookkeeping-accounting')

    expect(html).not.toMatch(/\bsections\.(overview|scope|process|outputs)\b/)
    expect(html).not.toMatch(/\brelated\.(title|postsTitle|postLabels)\b/)
    expect(html).not.toContain('items.')
  })
})
