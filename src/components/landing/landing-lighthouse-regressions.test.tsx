import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ClientLogosSection,
  splitClientLogoRows,
} from './ClientLogosSection'
import { ContactCtaSection } from './ContactCtaSection'
import { StatsSection } from './StatsSection'
import type { ClientItem } from './ClientLogosSection'
import { Footer } from '@/components/Footer'
import {
  CONTACT_EMAIL,
  FACEBOOK_PROFILE_URL,
  PHONE_TEL,
  STREET,
} from '@/lib/business'
import { CONSENT_OPEN_EVENT } from '@/lib/consent'

const clientItems: Array<ClientItem> = [
  { name: 'Alpha', logo: '/alpha.webp', href: 'https://alpha.test' },
  { name: 'Bravo', logo: '/bravo.webp' },
  { name: 'Charlie', logo: '/charlie.webp' },
  { name: 'Delta', logo: '/delta.webp' },
]

const translations: Record<string, unknown> = {
  'clients.items': clientItems,
  'clients.title': 'Client logos',
  'clients.logoAlt': 'Client logo',
  'clients.openClient': 'Open client website',
  'contactCta.bullets': ['Fast reply'],
  'contactCta.serviceOptions': ['Bookkeeping', 'Tax'],
  'contactCta.overline': 'Contact',
  'contactCta.title': 'Start a conversation',
  'contactCta.description': 'Tell us what you need.',
  'contactCta.formTitle': 'Send message',
  'contactCta.fields.name': 'Name',
  'contactCta.fields.email': 'Email',
  'contactCta.fields.message': 'Message',
  'contactCta.servicePlaceholder': 'Choose a service',
  'contactCta.submit': 'Send',
  'contactCta.success': 'Message sent',
  'stats.overline': 'Stats',
  'stats.title': 'Track record',
  'stats.cta': 'Contact us',
  'stats.items': {
    clients: {
      value: 30,
      suffix: '+',
      label: 'Clients',
      description: 'Active clients',
    },
    experience: {
      value: 15,
      suffix: '+',
      label: 'Years',
      description: 'Combined experience',
    },
    hours: {
      value: 1000,
      suffix: '+',
      label: 'Hours',
      description: 'Annual support hours',
    },
    retention: {
      value: 95,
      suffix: '%',
      label: 'Referral',
      description: 'Referred clients',
    },
  },
  'footer.description': 'Accounting agency in Sarajevo.',
  'footer.services': 'Services',
  'footer.company': 'Company',
  'footer.contact': 'Contact',
  'footer.servicesList.bookkeeping': 'Bookkeeping',
  'footer.servicesList.tax': 'Tax',
  'footer.servicesList.vcfo': 'Virtual CFO',
  'footer.servicesList.consulting': 'Consulting',
  'footer.servicesList.reporting': 'Reporting',
  'footer.servicesList.education': 'Education',
  'footer.companyLinks.about': 'About',
  'footer.companyLinks.missionVision': 'Mission',
  'footer.companyLinks.certificates': 'Certificates',
  'footer.companyLinks.blog': 'Blog',
  'footer.companyLinks.careers': 'Careers',
  'footer.companyLinks.contact': 'Contact',
  'footer.contactInfo.region': 'Sarajevo Canton',
  'footer.contactInfo.country': 'Bosnia and Herzegovina',
  'footer.contactInfo.hours': 'Mon-Fri',
  'footer.contactInfo.holidays': 'Closed on holidays',
  'footer.ctaTitle': 'Ready to begin?',
  'footer.ctaButton': 'Contact us',
  'footer.copyright': 'Copyright 2026',
  'footer.legal': 'Legal',
  'footer.legalLinks.privacyPolicy': 'Privacy',
  'footer.legalLinks.termsOfService': 'Terms',
  'footer.legalLinks.cookiePolicy': 'Cookies',
}

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { returnObjects?: boolean; defaultValue?: string }) => {
      if (key === 'clients.logoAlt') return `${options?.defaultValue ?? 'Client logo'}`
      if (key === 'clients.openClient') return `${options?.defaultValue ?? 'Open client website'}`
      const value = translations[key]
      if (Array.isArray(value)) return options?.returnObjects ? value : value.join(', ')
      return value ?? options?.defaultValue ?? key
    },
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/bs-BA' }),
}))

describe('landing Lighthouse regressions', () => {
  it('splits client logos deterministically for SSR hydration parity', () => {
    const first = splitClientLogoRows(clientItems)
    const second = splitClientLogoRows(clientItems)

    expect(first).toEqual(second)
    expect(first).toEqual([
      clientItems.slice(0, 2),
      clientItems.slice(2),
    ])
  })

  it('renders client logos without changing row order between renders', () => {
    const { container, rerender } = render(<ClientLogosSection />)
    const first = Array.from(container.querySelectorAll('[data-client-logo]')).map(
      (node) => node.getAttribute('data-client-logo'),
    )

    rerender(<ClientLogosSection />)

    expect(
      Array.from(container.querySelectorAll('[data-client-logo]')).map((node) =>
        node.getAttribute('data-client-logo'),
      ),
    ).toEqual(first)
    expect(
      container
        .querySelector('a[data-client-logo="Alpha"]')
        ?.getAttribute('aria-label'),
    ).toBe('Alpha logo. Alpha - open client website')
  })

  it('links each client once and renders the marquee duplicates as hidden decoration', () => {
    const { container } = render(<ClientLogosSection />)

    // Three marquee copies per row, but only the first copy is a real link.
    expect(container.querySelectorAll('[data-client-logo="Alpha"]')).toHaveLength(3)
    expect(container.querySelectorAll('a[href="https://alpha.test"]')).toHaveLength(1)

    const decorative = container.querySelectorAll('[aria-hidden="true"][data-client-logo]')
    expect(decorative).toHaveLength(clientItems.length * 2)
    decorative.forEach((node) => {
      expect(node.tagName).toBe('DIV')
      expect(node.querySelector('a')).toBeNull()
      node.querySelectorAll('img').forEach((image) => {
        expect(image.getAttribute('alt')).toBe('')
      })
    })

    // Client logos are not structured data.
    expect(container.querySelector('[itemprop], [itemscope]')).toBeNull()
  })

  it('labels the contact service select', () => {
    render(<ContactCtaSection />)

    expect(screen.getByLabelText('Choose a service').getAttribute('name')).toBe(
      'service',
    )
  })

  it('renders final stats values before in-view animation starts', () => {
    const { container } = render(<StatsSection />)

    expect(
      Array.from(container.querySelectorAll('.tabular-nums')).map((node) =>
        node.textContent,
      ),
    ).toEqual(['30+', '15+', '1.000+', '95%'])
  })

  it('keeps footer on the restored light background', () => {
    const { container } = render(<Footer />)
    const footer = container.querySelector('footer')

    expect(footer?.className).toContain('bg-background')
    expect(footer?.className).not.toContain('bg-primary')
    expect(footer?.querySelector('.text-white\\/60')).toBeNull()
    expect(footer?.querySelector('.text-white\\/80')).toBeNull()
  })

  it('renders footer NAP from business constants without microdata or headings', () => {
    const { container } = render(<Footer />)
    const footer = container.querySelector('footer')!

    expect(footer.querySelector('[itemprop], [itemscope], [itemtype]')).toBeNull()
    expect(footer.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull()

    expect(footer.querySelector(`a[href="tel:${PHONE_TEL}"]`)).not.toBeNull()
    expect(footer.querySelector(`a[href="mailto:${CONTACT_EMAIL}"]`)).not.toBeNull()
    expect(footer.querySelector('address')?.textContent).toContain(STREET)
    expect(footer.querySelector('address')?.textContent).toContain('71210 Ilidža')

    const facebook = footer.querySelector('a[aria-label="Facebook"]')
    expect(facebook?.getAttribute('href')).toBe(FACEBOOK_PROFILE_URL)
    expect(footer.innerHTML).not.toContain('/share/')
    expect(footer.innerHTML).not.toMatch(/\binfo@/)
  })

  it('re-opens the cookie banner from the footer', () => {
    const listener = vi.fn()
    window.addEventListener(CONSENT_OPEN_EVENT, listener)

    render(<Footer />)
    fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(CONSENT_OPEN_EVENT, listener)
  })
})
