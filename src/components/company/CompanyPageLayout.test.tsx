import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  CompanyPageLayout,
  CompanyPagePanel,
  getCompanySectionLabels,
} from './CompanyPageLayout'
import i18n from '@/i18n'

class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  configurable: true,
  writable: true,
  value: MockIntersectionObserver,
})

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

describe('CompanyPageLayout', () => {
  beforeAll(() => {
    i18n.addResourceBundle(
      'en-US',
      'common',
      { sections: { overview: 'Overview', gallery: 'Gallery', start: 'Start' } },
      true,
      true,
    )
    i18n.addResourceBundle(
      'bs-BA',
      'common',
      { sections: { overview: 'Pregled', gallery: 'Galerija', start: 'Početak' } },
      true,
      true,
    )
  })

  it('uses landing-style section scroller chrome for company pages', () => {
    render(
      <CompanyPageLayout
        labels={['Intro', 'Details']}
        ids={['intro', 'details']}
      >
        <CompanyPagePanel>Intro section</CompanyPagePanel>
        <CompanyPagePanel tone="muted">Details section</CompanyPagePanel>
      </CompanyPageLayout>,
    )

    const main = screen.getByRole('main')
    expect(main.className).toContain('bg-background')
    expect(document.querySelectorAll('[data-landing-section]')).toHaveLength(2)
    expect(document.getElementById('intro')).not.toBeNull()
    expect(document.getElementById('details')).not.toBeNull()
    expect(
      screen.getByText('Intro section').closest('section')?.className,
    ).toContain('bg-background')
    expect(
      screen.getByText('Details section').closest('section')?.className,
    ).toContain('bg-muted/15')
  })

  it('localizes company section labels for the scroller controls', () => {
    expect(
      getCompanySectionLabels('en-US', ['overview', 'gallery', 'start']),
    ).toEqual(['Overview', 'Gallery', 'Start'])
    expect(
      getCompanySectionLabels('bs-BA', ['overview', 'gallery', 'start']),
    ).toEqual(['Pregled', 'Galerija', 'Početak'])
  })

  it('returns empty labels instead of raw keys for a locale without them', () => {
    expect(getCompanySectionLabels('ja-JP', ['overview', 'start'])).toEqual([
      '',
      '',
    ])
  })
})
