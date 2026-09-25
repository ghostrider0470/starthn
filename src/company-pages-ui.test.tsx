// /contact as the Ilidža location page (directions, legal entity, reviews,
// tap-to-call, whole-card tap targets, Turnstile hint), and the structural
// fixes on /certificates (no duplicated paragraph or heading) and /careers
// (open application).
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
  GBP_DIRECTIONS_URL,
  GBP_WRITE_REVIEW_URL,
  GOOGLE_BUSINESS_PROFILE_URL,
  ID_BROJ,
  LEGAL_NAME,
  MBS,
  PHONE_TEL,
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

type RouteModule = { Route: { options: { component: ComponentType } } }

async function renderPage(
  load: () => Promise<RouteModule>,
  locale: string,
  pathname: string,
) {
  routerState.pathname = pathname
  await i18n.changeLanguage(locale)
  const { Route } = await load()
  const Page = Route.options.component
  const html = renderToString(<Page />)
  const doc = document.createElement('div')
  doc.innerHTML = html
  return { html, doc, text: doc.textContent }
}

const loadContact = () =>
  import('@/routes/{-$locale}/contact') as unknown as Promise<RouteModule>
const loadCertificates = () =>
  import('@/routes/{-$locale}/certificates') as unknown as Promise<RouteModule>
const loadCareers = () =>
  import('@/routes/{-$locale}/careers') as unknown as Promise<RouteModule>

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
  for (const locale of ['bs-BA', 'en-US', 'hr-HR', 'de-DE']) {
    for (const ns of I18N_NAMESPACES) {
      i18n.addResourceBundle(locale, ns, readBundle(locale, ns), true, true)
    }
  }
})

describe.each(['bs-BA', 'en-US', 'hr-HR'])('%s /contact', (locale) => {
  it('is the Ilidža location page: H2, local copy, directions and map links', async () => {
    const { doc, text } = await renderPage(
      loadContact,
      locale,
      `/${locale}/contact`,
    )
    const section = doc.querySelector('[data-testid="contact-location"]')!
    expect(section).not.toBeNull()
    expect(section.querySelector('h2')?.textContent).toBe(
      str(locale, 'pages', 'contact.location.title'),
    )
    expect(text).toContain(str(locale, 'pages', 'contact.location.body'))

    const directions = section.querySelector(
      `a[href="${GBP_DIRECTIONS_URL.replace(/&/g, '&amp;')}"], a[href="${GBP_DIRECTIONS_URL}"]`,
    )
    expect(directions?.textContent).toContain(
      str(locale, 'common', 'contactActions.directions'),
    )
    expect(directions?.getAttribute('rel')).toContain('noopener')
    const maps = Array.from(
      section.querySelectorAll(`a[href="${GOOGLE_BUSINESS_PROFILE_URL}"]`),
    ).find((a) =>
      a.textContent.includes(
        str(locale, 'common', 'contactActions.openInMaps'),
      ),
    )
    expect(maps).toBeTruthy()

    // Links only: no map embed, no static-map API (no Google request, no
    // cookie before consent).
    expect(doc.querySelector('iframe')).toBeNull()
    expect(doc.innerHTML).not.toMatch(/staticmap|maps\/embed|maps\.googleapis/)
  })

  it('states the legal entity and asks for a review', async () => {
    const { doc } = await renderPage(loadContact, locale, `/${locale}/contact`)
    const legal = doc.querySelector('[data-testid="contact-legal-entity"]')!
    expect(legal.textContent).toContain(LEGAL_NAME)
    expect(legal.textContent).toContain(ID_BROJ)
    expect(legal.textContent).toContain(MBS)

    const review = doc.querySelector(`a[href="${GBP_WRITE_REVIEW_URL}"]`)
    expect(review?.textContent).toBe(
      str(locale, 'common', 'contactActions.leaveReview'),
    )
    expect(doc.querySelector('[data-testid="google-rating"]')).not.toBeNull()
  })

  it('offers "Pozovi" in the hero and makes whole contact cards tap targets', async () => {
    const { doc } = await renderPage(loadContact, locale, `/${locale}/contact`)
    const tels = Array.from(doc.querySelectorAll(`a[href="tel:${PHONE_TEL}"]`))
    // Hero button + phone card (+ location copy has no link).
    expect(tels.length).toBeGreaterThanOrEqual(2)
    const hero = tels[0]
    const call = str(locale, 'common', 'contactActions.call')
    expect(hero.getAttribute('aria-label')).toBe(
      `${call} ${str(locale, 'pages', 'contact.methods.phone.value')}`,
    )
    // "Pozovi" is visible next to the number, inside the same button.
    expect(hero.parentElement?.textContent).toContain(call)
    expect(hero.className).toContain('after:inset-0')

    // Email, phone and location cards: the value link covers the card.
    for (const href of [`mailto:${CONTACT_EMAIL}`, `tel:${PHONE_TEL}`]) {
      const card = doc.querySelector(`li a[href="${href}"]`)
      expect(card?.className).toContain('after:absolute')
      expect(card?.closest('li')?.className).toContain('min-h-12')
    }
  })

  it('explains the disabled Send button while Turnstile verifies', async () => {
    const { doc } = await renderPage(loadContact, locale, `/${locale}/contact`)
    const status = doc.querySelector('[data-testid="turnstile-status"]')!
    expect(status.getAttribute('role')).toBe('status')
    expect(status.textContent).toContain(
      str(locale, 'pages', 'contact.form.verifying'),
    )
    const submit = doc.querySelector('button[type="submit"]')!
    expect(submit.getAttribute('aria-describedby')).toBe(status.id)
  })

  it('top-aligns the hero grid', async () => {
    const { doc } = await renderPage(loadContact, locale, `/${locale}/contact`)
    const h1 = doc.querySelector('h1')!
    expect(h1.closest('.grid')?.className).toContain('lg:items-start')
  })
})

describe('/contact in a locale without the location copy', () => {
  it('keeps its three panels and renders no raw keys', async () => {
    const pages = readBundle('de-DE', 'pages') as {
      contact: Record<string, unknown>
    }
    const stripped = structuredClone(pages)
    delete stripped.contact.location
    delete stripped.contact.reviews
    i18n.removeResourceBundle('de-DE', 'pages')
    i18n.addResourceBundle('de-DE', 'pages', stripped)

    const { doc, html } = await renderPage(
      loadContact,
      'de-DE',
      '/de-DE/contact',
    )
    expect(doc.querySelector('[data-testid="contact-location"]')).toBeNull()
    expect(html).not.toMatch(
      /contact\.location|contact\.reviews|contactActions\./,
    )
    expect(doc.querySelector(`a[href="tel:${PHONE_TEL}"]`)).not.toBeNull()

    i18n.removeResourceBundle('de-DE', 'pages')
    i18n.addResourceBundle('de-DE', 'pages', pages)
  })
})

describe.each(['bs-BA', 'en-US', 'hr-HR'])('%s /certificates', (locale) => {
  it('does not repeat the intro paragraph or the gallery heading', async () => {
    const { html, doc } = await renderPage(
      loadCertificates,
      locale,
      `/${locale}/certificates`,
    )
    const para2 = str(locale, 'pages', 'certificates.intro.para2')
    expect(html.split(para2).length - 1).toBe(1)
    expect(html).toContain(
      str(locale, 'pages', 'certificates.gallery.description'),
    )

    const heading = str(locale, 'pages', 'certificates.gallery.heading')
    const headingCount = Array.from(
      doc.querySelectorAll('h1,h2,h3,p,a,span'),
    ).filter(
      (el) => el.children.length === 0 && el.textContent === heading,
    ).length
    expect(headingCount).toBeLessThanOrEqual(2) // hero button + gallery H2

    // The first certificate's title is a caption, not a second heading.
    const firstTitle = (
      get(readBundle(locale, 'pages'), 'certificates.gallery.items') as Array<{
        title: string
      }>
    )[0].title
    const headings = Array.from(doc.querySelectorAll('h1,h2,h3')).filter(
      (h) => h.textContent === firstTitle,
    )
    expect(headings).toHaveLength(1)
  })
})

describe.each(['bs-BA', 'en-US', 'hr-HR'])('%s /careers', (locale) => {
  it('leads with an open application by e-mail', async () => {
    const { doc } = await renderPage(loadCareers, locale, `/${locale}/careers`)
    const badge = str(locale, 'pages', 'careers.badge')
    const apply = doc.querySelector(
      `a[href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(badge)}"]`,
    )
    expect(apply?.textContent).toBe(str(locale, 'pages', 'careers.jobs.sendCv'))
    expect(doc.querySelector('h1')?.closest('div')?.textContent).toContain(
      badge,
    )
  })
})
