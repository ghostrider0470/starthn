// Server-rendered bodies of the company pages, contact, services index and
// homepage (audit findings F15, F18, F19, F28, F40, F47): one copy of each
// heading block, localized alts and labels, the contact NAP cards and the
// homepage link to the startup guide.
//
// Kept outside src/routes so the router generator never sees it as a route.
import fs from 'node:fs'
import path from 'node:path'
import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type * as TanStackRouter from '@tanstack/react-router'
import type { ComponentType, ReactNode } from 'react'
import i18n, { I18N_NAMESPACES } from '@/i18n'
import {
  CONTACT_EMAIL,
  GOOGLE_BUSINESS_PROFILE_URL,
  PHONE_TEL,
  SRR_REGISTER_URL,
} from '@/lib/business'

const routerState = vi.hoisted(() => ({ pathname: '/bs-BA' }))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof TanStackRouter>()
  return {
    ...actual,
    createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string
      children?: ReactNode
      [key: string]: unknown
    }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useLocation: () => ({ pathname: routerState.pathname }),
  }
})

const LOCALES_DIR = path.resolve(process.cwd(), 'public/locales')
const ALL_LOCALES = fs
  .readdirSync(LOCALES_DIR)
  .filter((d) => fs.statSync(path.join(LOCALES_DIR, d)).isDirectory())
const KEPT_LOCALES = ['bs-BA', 'en-US', 'hr-HR'] as const

function readBundle(locale: string, ns: string): Record<string, unknown> {
  const file = path.join(LOCALES_DIR, locale, `${ns}.json`)
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
}

function get(obj: unknown, dotted: string): unknown {
  return dotted
    .split('.')
    .reduce<unknown>(
      (acc, k) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[k]
          : undefined,
      obj,
    )
}

function str(locale: string, ns: string, key: string): string {
  const value = get(readBundle(locale, ns), key)
  if (typeof value !== 'string') throw new Error(`${locale}/${ns}:${key}`)
  return value
}

/** Plain text with tags removed and entities decoded (via the DOM). */
function textOf(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

type RouteModule = { Route: { options: { component: ComponentType } } }

async function renderPage(
  load: () => Promise<RouteModule>,
  locale: string,
  pathname: string,
): Promise<{ html: string; text: string; doc: HTMLDivElement }> {
  routerState.pathname = pathname
  await i18n.changeLanguage(locale)
  const { Route } = await load()
  const Page = Route.options.component
  const html = renderToString(<Page />)
  const doc = document.createElement('div')
  doc.innerHTML = html
  return { html, text: textOf(html), doc }
}

const loadAbout = () =>
  import('@/routes/{-$locale}/about') as unknown as Promise<RouteModule>
const loadMissionVision = () =>
  import(
    '@/routes/{-$locale}/mission-vision'
  ) as unknown as Promise<RouteModule>
const loadServicesIndex = () =>
  import(
    '@/routes/{-$locale}/services.index'
  ) as unknown as Promise<RouteModule>
const loadCertificates = () =>
  import('@/routes/{-$locale}/certificates') as unknown as Promise<RouteModule>
const loadContact = () =>
  import('@/routes/{-$locale}/contact') as unknown as Promise<RouteModule>
const loadHome = () =>
  import('@/routes/{-$locale}/index') as unknown as Promise<RouteModule>

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  for (const locale of ALL_LOCALES) {
    for (const ns of I18N_NAMESPACES) {
      i18n.addResourceBundle(locale, ns, readBundle(locale, ns), true, true)
    }
  }
})

describe('page body translation keys', () => {
  // Every locale stays reachable (decision D1), so a key missing anywhere
  // would render as a raw key there (load: 'currentOnly', no fallback bundle).
  const PAGES_KEYS = [
    'about.images.heroAlt',
    'about.images.interiorAlt',
    'missionVision.images.heroAlt',
    'missionVision.images.interiorAlt',
    'certificates.quote',
    'certificates.quoteAuthor',
    'certificates.licenceLine',
    'certificates.verifyLink',
    'certificates.highlights.certifiedAccountants',
    'certificates.highlights.legalCompliance',
    'certificates.highlights.continuousEducation',
    'certificates.highlights.ethicalStandards',
    'contact.methods.phone.title',
    'contact.methods.phone.description',
    'contact.methods.phone.value',
    'contact.methods.hours.title',
    'contact.methods.hours.description',
    'contact.methods.hours.value',
  ]
  const LANDING_KEYS = ['guide.linkText', 'guide.description']
  const COMMON_SECTION_KEYS = [
    'overview',
    'services',
    'start',
    'home',
    'why',
    'evidence',
    'values',
    'trust',
    'contact',
    'faq',
  ].map((k) => `sections.${k}`)

  it.each(ALL_LOCALES)('%s has every key the page bodies use', (locale) => {
    const missing = [
      ...PAGES_KEYS.filter(
        (k) => typeof get(readBundle(locale, 'pages'), k) !== 'string',
      ),
      ...LANDING_KEYS.filter(
        (k) => typeof get(readBundle(locale, 'landing'), k) !== 'string',
      ),
      ...COMMON_SECTION_KEYS.filter(
        (k) => typeof get(readBundle(locale, 'common'), k) !== 'string',
      ),
    ]
    expect(missing).toEqual([])
  })

  it('keeps the phone value on the current number', () => {
    for (const locale of ALL_LOCALES) {
      expect(str(locale, 'pages', 'contact.methods.phone.value')).toBe(
        '061 221 368',
      )
    }
  })
})

describe.each(KEPT_LOCALES)('%s page bodies', (locale) => {
  it('about renders the why-us block once and localized alts', async () => {
    const { text, doc } = await renderPage(
      loadAbout,
      locale,
      `/${locale}/about`,
    )
    expect(count(text, str(locale, 'pages', 'about.whyUs.subtitle'))).toBe(1)
    expect(count(text, str(locale, 'pages', 'about.whyUs.description'))).toBe(1)
    const alts = [...doc.querySelectorAll('img')].map((img) =>
      img.getAttribute('alt'),
    )
    expect(alts).toEqual([
      str(locale, 'pages', 'about.images.heroAlt'),
      str(locale, 'pages', 'about.images.interiorAlt'),
    ])
  })

  it('mission-vision renders the values heading and hero text once', async () => {
    const { text, doc } = await renderPage(
      loadMissionVision,
      locale,
      `/${locale}/mission-vision`,
    )
    expect(
      count(text, str(locale, 'pages', 'missionVision.values.heading')),
    ).toBe(1)
    expect(
      count(text, str(locale, 'pages', 'missionVision.hero.description')),
    ).toBe(1)
    const alts = [...doc.querySelectorAll('img')].map((img) =>
      img.getAttribute('alt'),
    )
    expect(alts).toEqual([
      str(locale, 'pages', 'missionVision.images.heroAlt'),
      str(locale, 'pages', 'missionVision.images.interiorAlt'),
    ])
  })

  it('services index renders the intro title and description once', async () => {
    const { text, doc } = await renderPage(
      loadServicesIndex,
      locale,
      `/${locale}/services`,
    )
    expect(count(text, str(locale, 'services', 'index.introTitle'))).toBe(1)
    expect(count(text, str(locale, 'services', 'index.description'))).toBe(1)
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
  })

  it('certificates renders the localized quote, highlights and FMF register line', async () => {
    const { text, doc } = await renderPage(
      loadCertificates,
      locale,
      `/${locale}/certificates`,
    )
    expect(text).toContain(str(locale, 'pages', 'certificates.quote'))
    expect(text).toContain(str(locale, 'pages', 'certificates.quoteAuthor'))
    expect(text).toContain(str(locale, 'pages', 'certificates.licenceLine'))
    expect(text).toContain(
      str(locale, 'pages', 'certificates.highlights.legalCompliance'),
    )
    // No SRR licence claim or register link until the owner confirms it.
    expect(doc.querySelector(`a[href="${SRR_REGISTER_URL}"]`)).toBeNull()
    expect(text).not.toContain('CR-6093')
    if (locale !== 'en-US') {
      expect(text).not.toMatch(
        /Legal Compliance|Ethical Standards|Start HN Accounting Agency/,
      )
    }
  })

  it('contact shows email, phone, address (GBP link) and hours', async () => {
    const { html, text, doc } = await renderPage(
      loadContact,
      locale,
      `/${locale}/contact`,
    )
    expect(html).not.toContain('info@starthn.ba')
    expect(html).not.toContain('maps.google.com/?q=')
    expect(html).not.toMatch(/135[ -/]?377/)
    expect(
      doc.querySelector(`a[href="mailto:${CONTACT_EMAIL}"]`),
    ).not.toBeNull()
    expect(doc.querySelector(`a[href="tel:${PHONE_TEL}"]`)?.textContent).toBe(
      '061 221 368',
    )
    const gbp = doc.querySelector(`a[href="${GOOGLE_BUSINESS_PROFILE_URL}"]`)
    expect(gbp?.textContent).toBe(
      str(locale, 'pages', 'contact.methods.location.value'),
    )
    expect(gbp?.getAttribute('rel')).toContain('noopener')
    expect(text).toContain(str(locale, 'pages', 'contact.methods.hours.value'))
    expect(text).toContain('Ibrahima Ljubovića 47, 71210 Ilidža')
  })

  it('homepage links to the startup guide with its title as anchor text', async () => {
    const { doc } = await renderPage(loadHome, locale, `/${locale}`)
    const link = doc.querySelector(
      `a[href="/${locale}/blog/how-to-start-a-business-in-bih-a-practical-guide-tips-from-experience-with-the-n1-tv-appearance"]`,
    )
    expect(link?.textContent).toBe(str(locale, 'landing', 'guide.linkText'))
  })
})

describe('reachable non-indexed locale', () => {
  it('renders de-DE certificates and contact without English leaks or raw keys', async () => {
    const cert = await renderPage(
      loadCertificates,
      'de-DE',
      '/de-DE/certificates',
    )
    expect(cert.text).toContain(
      str('de-DE', 'pages', 'certificates.highlights.certifiedAccountants'),
    )
    expect(cert.text).not.toMatch(/Certified Accountants|Legal Compliance/)
    expect(cert.text).not.toMatch(/certificates\.[a-z]/)

    const contact = await renderPage(loadContact, 'de-DE', '/de-DE/contact')
    expect(contact.text).toContain(
      str('de-DE', 'pages', 'contact.methods.hours.value'),
    )
    expect(contact.text).not.toMatch(/contact\.methods\./)
  })
})
