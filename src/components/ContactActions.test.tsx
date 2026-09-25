import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CallLink,
  GoogleRatingLink,
  phoneForLocale,
  useCallLabels,
  useLegalEntityLine,
} from './ContactActions'
import type { ReactElement } from 'react'
import i18n from '@/i18n'
import {
  GOOGLE_BUSINESS_PROFILE_URL,
  ID_BROJ,
  LEGAL_NAME,
  MBS,
} from '@/lib/business'

const telClick = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('@/lib/analytics', () => ({ analytics: { telClick } }))

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), `public/locales/${locale}/${ns}.json`),
      'utf8',
    ),
  ) as Record<string, unknown>
}

function withLocale(locale: string, ui: ReactElement) {
  const instance = i18n.cloneInstance({ lng: locale, initAsync: false })
  return <I18nextProvider i18n={instance}>{ui}</I18nextProvider>
}

function Labels() {
  const labels = useCallLabels()
  const legal = useLegalEntityLine()
  return (
    <>
      <span data-testid="call">{labels.call}</span>
      <span data-testid="callNumber">{labels.callNumber}</span>
      <span data-testid="callAria">{labels.callAria}</span>
      <span data-testid="legal">{legal}</span>
    </>
  )
}

/** de-DE without the new strings: a locale the translator has not reached. */
function commonWithoutNewKeys(locale: string): Record<string, unknown> {
  const bundle = readBundle(locale, 'common')
  delete bundle.contactActions
  delete bundle.trust
  delete bundle.legalEntity
  return bundle
}

beforeAll(() => {
  for (const locale of ['bs-BA', 'en-US', 'hr-HR']) {
    i18n.addResourceBundle(
      locale,
      'common',
      readBundle(locale, 'common'),
      true,
      true,
    )
  }
  i18n.removeResourceBundle('de-DE', 'common')
  i18n.addResourceBundle('de-DE', 'common', commonWithoutNewKeys('de-DE'))
})

beforeEach(() => telClick.mockClear())

describe('phoneForLocale', () => {
  it('uses the local format for BiH-region locales and +387 elsewhere', () => {
    expect(phoneForLocale('bs-BA')).toBe('061 221 368')
    expect(phoneForLocale('hr-HR')).toBe('061 221 368')
    expect(phoneForLocale('en-US')).toBe('+387 61 221 368')
    expect(phoneForLocale('de-DE')).toBe('+387 61 221 368')
  })
})

describe('CallLink', () => {
  it('dials the office and reports a consent-gated tel_click with its placement', () => {
    render(
      <CallLink placement="header" aria-label="Pozovite">
        x
      </CallLink>,
    )
    const link = screen.getByRole('link', { name: 'Pozovite' })
    expect(link.getAttribute('href')).toBe('tel:+38761221368')

    fireEvent.click(link)
    expect(telClick).toHaveBeenCalledWith('header')
  })

  it('keeps a caller onClick', () => {
    const onClick = vi.fn()
    render(
      <CallLink placement="footer" onClick={onClick}>
        call
      </CallLink>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'call' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(telClick).toHaveBeenCalledWith('footer')
  })
})

describe('call labels and legal line', () => {
  it('bs-BA: "Pozovi 061 221 368" and the registered legal entity', () => {
    render(withLocale('bs-BA', <Labels />))
    expect(screen.getByTestId('call').textContent).toBe('Pozovi')
    expect(screen.getByTestId('callNumber').textContent).toBe(
      'Pozovi 061 221 368',
    )
    expect(screen.getByTestId('callAria').textContent).toContain('061 221 368')
    expect(screen.getByTestId('legal').textContent).toBe(
      `${LEGAL_NAME} · JIB ${ID_BROJ} · MBS ${MBS} · Ured: Ibrahima Ljubovića 47, 71210 Ilidža`,
    )
  })

  it('en-US: international number', () => {
    render(withLocale('en-US', <Labels />))
    expect(screen.getByTestId('callNumber').textContent).toBe(
      'Call +387 61 221 368',
    )
  })

  it('a locale without the strings gets neutral text, never a raw key', () => {
    const { container } = render(withLocale('de-DE', <Labels />))
    expect(container.textContent).not.toMatch(/contactActions\.|legalEntity\./)
    expect(screen.getByTestId('call').textContent).toBe('Tel.')
    expect(screen.getByTestId('callNumber').textContent).toBe('+387 61 221 368')
    expect(screen.getByTestId('legal').textContent).toBe(
      `${LEGAL_NAME} · JIB ${ID_BROJ} · MBS ${MBS} · Ibrahima Ljubovića 47, 71210 Ilidža`,
    )
  })
})

describe('GoogleRatingLink', () => {
  it('bs-BA: visible "5,0 ★ na Googleu (19 recenzija)" linked to the profile', () => {
    render(withLocale('bs-BA', <GoogleRatingLink />))
    const link = screen.getByTestId('google-rating')
    expect(link.getAttribute('href')).toBe(GOOGLE_BUSINESS_PROFILE_URL)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.textContent).toBe('5,0★na Googleu (19 recenzija)')
    // The star glyph is not read out.
    expect(link.querySelector('[aria-hidden="true"]')?.textContent).toBe('★')
    expect(
      screen.getByRole('link', { name: '5,0 na Googleu (19 recenzija)' }),
    ).toBe(link)
  })

  it('en-US: "5.0 ★ on Google (19 reviews)"', () => {
    const html = renderToString(withLocale('en-US', <GoogleRatingLink />))
    expect(html).toMatch(
      /5\.0<span aria-hidden="true"[^>]*>★<\/span>on Google \(19 reviews\)/,
    )
  })

  it('a locale without the string gets a neutral line, never a raw key', () => {
    const html = renderToString(withLocale('de-DE', <GoogleRatingLink />))
    expect(html).not.toContain('trust.')
    expect(html).toMatch(
      /5,0<span aria-hidden="true"[^>]*>★<\/span>Google \(19\)/,
    )
  })

  it('is visible text only: no review markup', () => {
    const html = renderToString(withLocale('bs-BA', <GoogleRatingLink />))
    expect(html).not.toMatch(/itemprop|itemscope|AggregateRating|ld\+json/)
  })
})
