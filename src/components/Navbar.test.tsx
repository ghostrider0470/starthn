import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Navbar } from './Navbar'
import type { ReactNode } from 'react'
import i18n from '@/i18n'

const telClick = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('@/lib/analytics', () => ({ analytics: { telClick } }))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
    canAccessAdmin: false,
  }),
}))
vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <button type="button">BS</button>,
}))
vi.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => (
    <button type="button" data-testid="theme-toggle">
      theme
    </button>
  ),
}))
vi.mock('@/components/UserDropdownMenu', () => ({
  UserDropdownMenu: () => null,
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/bs-BA' }),
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

const common = readBundle('bs-BA', 'common') as {
  nav: { solutions: string; toggleMenu: string }
  footer: { contactInfo: { hours: string; holidays: string } }
}

beforeAll(() => {
  i18n.addResourceBundle('bs-BA', 'common', common, true, true)
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
})

beforeEach(() => telClick.mockClear())

describe('Navbar', () => {
  it('offers tap-to-call in the mobile header, in place of the theme toggle', () => {
    const html = renderToString(
      <Shell>
        <Navbar />
      </Shell>,
    )
    const tel = html.match(/<a[^>]*href="tel:\+38761221368"[^>]*>/)?.[0] ?? ''
    expect(tel).toContain('aria-label="Pozovite Start HN na broj 061 221 368"')
    expect(tel).toContain('lg:hidden')
    expect(tel).toContain('size-11')
    // The theme toggle is desktop-only in the header (server-rendered as the
    // plain button; its menu loads on demand).
    expect(html).toMatch(
      /<div class="hidden lg:flex"><button[^>]*aria-haspopup="menu"/,
    )
  })

  it('has no link wrapped around a button and no doubled brand name', () => {
    const html = renderToString(
      <Shell>
        <Navbar />
      </Shell>,
    )
    expect(html).not.toMatch(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<button\b/)
    // The logo is decorative: the visible brand text names the home link.
    expect(html).toMatch(/<img[^>]*src="\/logo-64\.webp"[^>]*alt=""/)
  })

  it('has 44px menu and call buttons', () => {
    render(
      <Shell>
        <Navbar />
      </Shell>,
    )
    const menu = screen.getByRole('button', { name: common.nav.toggleMenu })
    expect(menu.className).toContain('size-11')
  })

  it('opens an opaque sheet without a duplicate "Usluge", with phone and hours', async () => {
    render(
      <Shell>
        <Navbar />
      </Shell>,
    )
    const menuButton = screen.getByRole('button', {
      name: common.nav.toggleMenu,
    })
    expect(menuButton.getAttribute('aria-haspopup')).toBe('dialog')
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    // The sheet is a separate chunk, loaded on the first press.
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(menuButton)
    const sheet = await screen.findByRole('dialog')
    expect(menuButton.getAttribute('aria-expanded')).toBe('true')

    expect(sheet.className).toContain('bg-background')
    expect(sheet.className).not.toMatch(/from-card\/50|bg-gradient/)

    // "Usluge" appears once: the accordion, not also as a quick link.
    expect(within(sheet).getAllByText(common.nav.solutions)).toHaveLength(1)
    expect(
      within(sheet).queryByRole('link', { name: common.nav.solutions }),
    ).toBeNull()

    const contact = within(sheet).getByTestId('menu-contact')
    const call = within(contact).getByRole('link', {
      name: 'Pozovi 061 221 368',
    })
    expect(call.getAttribute('href')).toBe('tel:+38761221368')
    expect(call.className).toContain('min-h-12')
    expect(contact.textContent).toContain(common.footer.contactInfo.hours)
    expect(contact.textContent).toContain(common.footer.contactInfo.holidays)
    expect(within(contact).getByTestId('theme-toggle')).toBeTruthy()

    fireEvent.click(call)
    expect(telClick).toHaveBeenCalledWith('menu_sheet')
  })

  it('server-renders the desktop navigation without Radix, with every entry', () => {
    const html = renderToString(
      <Shell>
        <Navbar />
      </Shell>,
    )
    // Plain dropdown buttons (the Radix menu replaces them on large screens).
    for (const id of ['solutions', 'resources', 'company']) {
      expect(html).toMatch(
        new RegExp(`<button[^>]*data-nav-id="${id}"[^>]*aria-expanded="false"`),
      )
    }
    expect(html).not.toContain('data-radix')
    expect(html).toContain(common.nav.solutions)
  })

  it('hands keyboard focus over to the interactive desktop menu', async () => {
    render(
      <Shell>
        <Navbar />
      </Shell>,
    )
    const staticTrigger = document.querySelector<HTMLButtonElement>(
      'button[data-nav-id="company"]',
    )!
    expect(staticTrigger.getAttribute('data-slot')).toBe(
      'navigation-menu-trigger',
    )
    await act(async () => {
      staticTrigger.focus()
    })
    await waitFor(() => {
      const active = document.activeElement as HTMLElement | null
      expect(active?.getAttribute('data-nav-id')).toBe('company')
      // The Radix trigger, not the static button.
      expect(active).not.toBe(staticTrigger)
      expect(active?.getAttribute('aria-controls')).toBeTruthy()
    })
  })

  it('opens the dropdown that was clicked before the menu code loaded', async () => {
    render(
      <Shell>
        <Navbar />
      </Shell>,
    )
    fireEvent.click(
      document.querySelector<HTMLButtonElement>(
        'button[data-nav-id="company"]',
      )!,
    )
    await waitFor(() => {
      const trigger = document.querySelector('button[data-nav-id="company"]')!
      expect(trigger.getAttribute('data-state')).toBe('open')
    })
  })
})
