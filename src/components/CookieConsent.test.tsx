import { act, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CookieConsent } from './CookieConsent'
import {
  CONSENT_STORAGE_KEY,
  __resetConsentMemoryForTests,
  openCookieSettings,
} from '@/lib/consent'

const translations = vi.hoisted(() => ({
  current: {
    'consent.title': 'Kolačići i privatnost',
    'consent.text': 'Uz vaš pristanak koristimo Google Analytics i Microsoft Clarity.',
    'consent.accept': 'Prihvatam',
    'consent.reject': 'Odbijam',
    'consent.privacyLink': 'Politika privatnosti',
  } as Partial<Record<string, string>>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      translations.current[key] ?? options?.defaultValue ?? key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    hash,
    children,
    ...props
  }: {
    to: string
    hash?: string
    children: React.ReactNode
  }) => (
    <a href={hash ? `${to}#${hash}` : to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/bs-BA/about' }),
}))

const bsTranslations = { ...translations.current }

beforeEach(() => {
  window.localStorage.clear()
  __resetConsentMemoryForTests()
  translations.current = { ...bsTranslations }
})

describe('CookieConsent', () => {
  it('renders nothing on the server (no hydration mismatch, no SSR banner)', () => {
    expect(renderToString(<CookieConsent />)).toBe('')
  })

  it('shows an accessible, non-modal banner when no decision exists', () => {
    render(<CookieConsent />)
    const dialog = screen.getByRole('dialog', { name: 'Kolačići i privatnost' })
    expect(dialog.getAttribute('aria-live')).toBe('polite')
    expect(dialog.getAttribute('aria-modal')).toBe('false')
    expect(dialog.className).toContain('fixed')

    const link = screen.getByRole('link', { name: 'Politika privatnosti' })
    expect(link.getAttribute('href')).toBe('/bs-BA/privacy#cookies')
  })

  it('Accept stores granted and hides the banner', () => {
    render(<CookieConsent />)
    fireEvent.click(screen.getByRole('button', { name: 'Prihvatam' }))
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Reject stores denied and hides the banner', () => {
    render(<CookieConsent />)
    fireEvent.click(screen.getByRole('button', { name: 'Odbijam' }))
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('denied')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stays hidden after a decision until cookie settings are opened', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied')
    render(<CookieConsent />)
    expect(screen.queryByRole('dialog')).toBeNull()

    act(() => openCookieSettings())
    const dialog = screen.getByRole('dialog')
    expect(document.activeElement).toBe(dialog)

    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('denied')
  })

  it('lets a returning visitor change their mind', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied')
    render(<CookieConsent />)
    act(() => openCookieSettings())
    fireEvent.click(screen.getByRole('button', { name: 'Prihvatam' }))
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted')
  })

  it('Escape does not dismiss the first-time banner', () => {
    render(<CookieConsent />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('never renders raw keys when a locale lacks the consent strings', () => {
    translations.current = {}
    const { container } = render(<CookieConsent />)
    expect(container.textContent).not.toMatch(/consent\./)
    expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Decline' })).toBeTruthy()
  })
})
