import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { TestimonialsSection } from './TestimonialsSection'
import i18n from '@/i18n'

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), `public/locales/${locale}/${ns}.json`),
      'utf8',
    ),
  ) as Record<string, unknown>
}

type Landing = {
  testimonials: { items: Array<{ quote: string; author: string }> }
}

const landing = readBundle('bs-BA', 'landing') as unknown as Landing

function ui() {
  const instance = i18n.cloneInstance({ lng: 'bs-BA', initAsync: false })
  return (
    <I18nextProvider i18n={instance}>
      <TestimonialsSection />
    </I18nextProvider>
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
  i18n.addResourceBundle('bs-BA', 'landing', landing, true, true)
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})

afterEach(() => vi.useRealTimers())

describe('TestimonialsSection', () => {
  it('server-renders every testimonial, with only the current one in the flow', () => {
    const html = renderToString(ui())
    for (const item of landing.testimonials.items) {
      expect(html).toContain(item.author)
    }
    const active = html.match(/<div[^>]*data-active="true"[^>]*>/g) ?? []
    expect(active).toHaveLength(1)
    expect(active[0]).toContain('relative')
    const hidden =
      html.match(
        /<div aria-hidden="true"[^>]*class="[^"]*invisible absolute[^"]*"/g,
      ) ?? []
    expect(hidden).toHaveLength(landing.testimonials.items.length - 1)
  })

  it('changes only when the visitor asks (no auto-advance)', () => {
    vi.useFakeTimers()
    render(ui())
    const first = landing.testimonials.items[0].author
    const current = () =>
      document.querySelector('[data-active="true"]')?.textContent ?? ''
    expect(current()).toContain(first)

    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    expect(current()).toContain(first)

    fireEvent.click(
      screen.getByRole('button', { name: 'Sljedeća izjava klijenta' }),
    )
    expect(current()).toContain(landing.testimonials.items[1].author)
  })

  it('has 44px arrows and dots with a 32x44 hit area', () => {
    render(ui())
    const next = screen.getByRole('button', {
      name: 'Sljedeća izjava klijenta',
    })
    expect(next.className).toContain('h-11')
    expect(next.className).toContain('w-11')
    const dot = screen.getByRole('button', { name: 'Izjava klijenta 2' })
    expect(dot.className).toContain('h-11')
    expect(dot.className).toContain('w-8')
  })

  it('shows the Google rating under the testimonials', () => {
    const html = renderToString(ui())
    expect(html).toContain(
      'href="https://maps.google.com/?cid=6152645102359996777"',
    )
    expect(html).toMatch(
      /5,0\s*<span aria-hidden="true"[^>]*>★<\/span>\s*na Googleu \(19 recenzija\)/,
    )
  })
})
