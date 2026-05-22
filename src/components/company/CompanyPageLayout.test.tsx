import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  CompanyPageLayout,
  CompanyPagePanel,
  getCompanySectionLabels,
} from './CompanyPageLayout'

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
      getCompanySectionLabels('en-US', ['overview', 'team', 'start']),
    ).toEqual(['Overview', 'Team', 'Start'])
    expect(
      getCompanySectionLabels('bs-BA', ['overview', 'team', 'start']),
    ).toEqual(['Pregled', 'Tim', 'Početak'])
  })
})
