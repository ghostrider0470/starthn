import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BlogPost } from '@/data/blog-posts'
import { BlogPostCard } from './BlogPostCard'

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

vi.mock('@/hooks/useCategoryQueries', () => ({
  usePublicCategories: () => ({
    data: [],
  }),
}))

vi.mock('@/hooks/useTagQueries', () => ({
  usePublicTags: () => ({
    data: [],
  }),
}))

const post: BlogPost = {
  slug: 'how-to-start-a-business',
  title: 'Kako zapoceti biznis u BiH',
  excerpt: 'Praktican vodic za pokretanje biznisa.',
  publishedAt: '2025-11-22',
  author: 'Selma Hadzic',
  readTime: '4 min read',
  category: 'Preduzetnistvo',
  tags: [],
  content: [],
}

describe('BlogPostCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to a readable date when the active locale formats raw ICU patterns', () => {
    const originalFormatter = Date.prototype.toLocaleDateString
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(function (
      this: Date,
      locale?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions,
    ) {
      if (locale === 'bs-BA') return '2025 M11 22'
      return originalFormatter.call(this, locale, options)
    })

    render(<BlogPostCard post={post} locale="bs-BA" />)

    expect(screen.getByText('November 22, 2025')).toBeTruthy()
    expect(screen.queryByText('2025 M11 22')).toBeNull()
  })
})
