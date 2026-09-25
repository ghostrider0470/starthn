import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileBottomNav } from './MobileBottomNav'
import { CookieConsent } from './CookieConsent'
import type { ReactNode } from 'react'
import i18n from '@/i18n'
import {
  CONSENT_STORAGE_KEY,
  __resetConsentMemoryForTests,
} from '@/lib/consent'

const telClick = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('@/lib/analytics', () => ({ analytics: { telClick } }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    hash,
    children,
    ...props
  }: {
    to: string
    hash?: string
    children: ReactNode
  }) => (
    <a href={hash ? `${to}#${hash}` : to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/bs-BA/services/tax-consulting' }),
}))

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), `public/locales/${locale}/${ns}.json`),
      'utf8',
    ),
  ) as Record<string, unknown>
}

function Shell({ children }: { children: ReactNode }) {
  const instance = i18n.cloneInstance({ lng: 'bs-BA', initAsync: false })
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>
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

beforeEach(() => {
  window.localStorage.clear()
  __resetConsentMemoryForTests()
  telClick.mockClear()
})

describe('MobileBottomNav', () => {
  it('server-renders the four sections plus tap-to-call, visible', () => {
    const html = renderToString(
      <Shell>
        <MobileBottomNav />
      </Shell>,
    )
    expect(html).not.toMatch(/<nav[^>]*\shidden/)
    for (const href of [
      '/bs-BA',
      '/bs-BA/services',
      '/bs-BA/blog',
      '/bs-BA/contact',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).toContain('href="tel:+38761221368"')
    expect(html).toContain('Pozovi')
  })

  it('names every item by its visible label and marks the current section', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied')
    render(
      <Shell>
        <MobileBottomNav />
      </Shell>,
    )
    const services = screen.getByRole('link', { name: 'Usluge' })
    expect(services.getAttribute('aria-current')).toBe('page')
    const call = screen.getByRole('link', { name: 'Pozovi 061 221 368' })
    expect(call.getAttribute('href')).toBe('tel:+38761221368')
    // 48px-tall items.
    expect(call.className).toContain('min-h-12')

    fireEvent.click(call)
    expect(telClick).toHaveBeenCalledWith('bottom_nav')
  })

  it('steps aside while the cookie bar is docked in its place', () => {
    const { container } = render(
      <Shell>
        <MobileBottomNav />
        <CookieConsent />
      </Shell>,
    )
    const nav = container.querySelector('nav')!
    // First visit: the banner is open and the nav is hidden.
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(nav.hidden).toBe(true)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Odbijam' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(nav.hidden).toBe(false)
  })
})
