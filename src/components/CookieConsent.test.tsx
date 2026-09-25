import { act, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CookieConsent, useConsentBannerOpen } from './CookieConsent'
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

  it('docks a compact bar at the bottom edge on phones and a corner card from md', () => {
    translations.current = {
      ...bsTranslations,
      'consent.textCompact': 'Kratki tekst o pristanku.',
    }
    render(<CookieConsent />)
    const dialog = screen.getByRole('dialog')

    // Phones: full-width bar at the very bottom (in place of the bottom nav).
    expect(dialog.className).toMatch(/(^|\s)bottom-0(\s|$)/)
    expect(dialog.className).toMatch(/(^|\s)inset-x-0(\s|$)/)
    // md+: bottom-right card, clear of the left-aligned hero CTAs.
    expect(dialog.className).toContain('md:right-6')
    expect(dialog.className).not.toContain('md:left-6')

    // Short copy on phones, full copy from md, both in the description.
    expect(dialog.textContent).toContain('Kratki tekst o pristanku.')
    expect(dialog.textContent).toContain(bsTranslations['consent.text'])
  })

  it('falls back to the full text on phones when the short copy is missing', () => {
    render(<CookieConsent />)
    const text = bsTranslations['consent.text'] as string
    const occurrences = screen.getByRole('dialog').textContent.split(text).length
    expect(occurrences).toBe(3) // full text twice: phone span + md span
  })

  it('keeps both choices equal weight and 44px tall', () => {
    render(<CookieConsent />)
    const reject = screen.getByRole('button', { name: 'Odbijam' })
    const accept = screen.getByRole('button', { name: 'Prihvatam' })
    expect(reject.className).toBe(accept.className)
    expect(accept.className).toContain('h-11')
  })

  it('reports whether it is open, so the bottom nav can step aside', () => {
    function Probe() {
      return <span data-testid="probe">{String(useConsentBannerOpen())}</span>
    }
    render(
      <>
        <Probe />
        <CookieConsent />
      </>,
    )
    expect(screen.getByTestId('probe').textContent).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Odbijam' }))
    expect(screen.getByTestId('probe').textContent).toBe('false')
  })

  it('reports closed during SSR', () => {
    function Probe() {
      return <span>{String(useConsentBannerOpen())}</span>
    }
    expect(renderToString(<Probe />)).toBe('<span>false</span>')
  })
})
