import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Footer } from './Footer'
import type { ReactNode } from 'react'
import i18n from '@/i18n'
import {
  GOOGLE_BUSINESS_PROFILE_URL,
  ID_BROJ,
  LEGAL_NAME,
  MBS,
  STREET,
} from '@/lib/business'

const telClick = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('@/lib/analytics', () => ({ analytics: { telClick } }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/bs-BA/contact' }),
}))

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), `public/locales/${locale}/${ns}.json`),
      'utf8',
    ),
  ) as Record<string, unknown>
}

function renderFooter() {
  const instance = i18n.cloneInstance({ lng: 'bs-BA', initAsync: false })
  return render(
    <I18nextProvider i18n={instance}>
      <Footer />
    </I18nextProvider>,
  )
}

beforeAll(() => {
  i18n.addResourceBundle(
    'bs-BA',
    'common',
    readBundle('bs-BA', 'common'),
    true,
    true,
  )
})

describe('Footer', () => {
  it('states the registered legal entity with its register numbers', () => {
    renderFooter()
    expect(screen.getByTestId('legal-entity').textContent).toBe(
      `${LEGAL_NAME} · JIB ${ID_BROJ} · MBS ${MBS} · Ured: Ibrahima Ljubovića 47, 71210 Ilidža`,
    )
  })

  it('links the office address to the Google Business Profile (plain link)', () => {
    const { container } = renderFooter()
    const address = container.querySelector('address')!
    const link = address.querySelector('a')!
    expect(link.getAttribute('href')).toBe(GOOGLE_BUSINESS_PROFILE_URL)
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.textContent).toContain(STREET)
    // No embedded map: nothing from Google loads with the footer.
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('lazy-loads the Horizon Tech logo without changing its link or label', () => {
    const { container } = renderFooter()
    const logo = container.querySelector('img[src="/clients/horizon-40.webp"]')!
    expect(logo.getAttribute('loading')).toBe('lazy')
    // Decorative: the link text names the link, so the name is not read twice
    // (Lighthouse image-redundant-alt).
    expect(logo.getAttribute('alt')).toBe('')
    const link = logo.closest('a')!
    expect(link.getAttribute('href')).toBe('https://horizon-tech.io')
    expect(link.textContent).toContain('Horizon Tech d.o.o.')
    expect(link.textContent?.trim()).toBe('Horizon Tech d.o.o.')
  })

  it('reports footer phone taps as tel_click (consent-gated in analytics)', () => {
    renderFooter()
    const tel = screen.getByRole('link', { name: '+387 61 221 368' })
    fireEvent.click(tel)
    expect(telClick).toHaveBeenCalledWith('footer')
  })

  it('gives the social icons a 44px target', () => {
    renderFooter()
    for (const name of ['LinkedIn', 'Instagram', 'Facebook']) {
      const link = screen.getByRole('link', { name })
      expect(link.className).toContain('h-11')
      expect(link.className).toContain('w-11')
    }
  })
})
