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
      if (locale === 'hr-HR') return '2025 M11 22'
      return originalFormatter.call(this, locale, options)
    })

    render(<BlogPostCard post={post} locale="hr-HR" />)

    expect(screen.getByText('November 22, 2025')).toBeTruthy()
    expect(screen.queryByText('2025 M11 22')).toBeNull()
  })

  it('formats Bosnian dates without relying on ICU data', () => {
    const formatter = vi.spyOn(Date.prototype, 'toLocaleDateString')

    render(<BlogPostCard post={post} locale="bs-BA" />)

    expect(screen.getByText('22. novembar 2025.')).toBeTruthy()
    expect(formatter).not.toHaveBeenCalled()
  })

  it('credits the brand instead of crashing when the post has no author (nullable author_name)', () => {
    const noAuthor = { ...post, author: null } as unknown as BlogPost

    render(<BlogPostCard post={noAuthor} locale="bs-BA" />)

    expect(screen.getByText('Start HN')).toBeTruthy()
    expect(screen.getByText('SH')).toBeTruthy()
  })

  it('renders the author initials when an author is set', () => {
    render(<BlogPostCard post={post} locale="bs-BA" />)

    expect(screen.getByText('Selma Hadzic')).toBeTruthy()
    expect(screen.getByText('SH')).toBeTruthy()
  })
})
