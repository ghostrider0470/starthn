import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BlogPostPreview } from './BlogPostPreview'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('BlogPostPreview', () => {
  it('renders category, subcategory, and tags in the article header', () => {
    render(
      <BlogPostPreview
        title="Tax advisory update"
        excerpt="What changed this month."
        author="Start HN"
        category="Tax"
        subcategory="VAT"
        publishedAt="2026-05-01"
        readTime="4 min read"
        content={['Article body']}
        tags={['Compliance', 'Payroll']}
        locale="en-US"
      />,
    )

    expect(screen.getByText('Tax')).toBeTruthy()
    expect(screen.getByText('VAT')).toBeTruthy()
    expect(screen.getByText('Compliance')).toBeTruthy()
    expect(screen.getByText('Payroll')).toBeTruthy()
  })
})
