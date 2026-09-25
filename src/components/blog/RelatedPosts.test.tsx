import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { RelatedPosts } from './RelatedPosts'
import type { BlogPost } from '@/data/blog-posts'

const useRelatedBlogPosts = vi.fn(() => ({ data: [] as Array<BlogPost> }))

vi.mock('@/hooks/useBlogQueries', () => ({
  useRelatedBlogPosts: (...args: Array<unknown>) => useRelatedBlogPosts(...(args as [])),
}))

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
  usePublicCategories: () => ({ data: [] }),
}))

vi.mock('@/hooks/useTagQueries', () => ({
  usePublicTags: () => ({ data: [] }),
}))

const post = (slug: string, title: string): BlogPost => ({
  slug,
  title,
  excerpt: 'Kratak opis.',
  publishedAt: '2025-11-22',
  author: 'Selma Hadzic',
  readTime: '4 min read',
  category: 'Preduzetnistvo',
  tags: [],
  content: [],
})

describe('RelatedPosts', () => {
  it('server-renders the loader posts, fully visible, without fetching', () => {
    useRelatedBlogPosts.mockClear()
    const html = renderToString(
      <RelatedPosts
        currentPost={post('current', 'Trenutni post')}
        locale="bs-BA"
        initialRelated={[post('a', 'Prvi povezani post'), post('b', 'Drugi povezani post')]}
      />,
    )
    expect(html).toContain('Prvi povezani post')
    expect(html).toContain('Drugi povezani post')
    expect(html).not.toContain('opacity:0')
    expect(useRelatedBlogPosts).not.toHaveBeenCalled()
  })

  it('renders nothing for an empty loader list', () => {
    const html = renderToString(
      <RelatedPosts currentPost={post('current', 'Trenutni post')} locale="bs-BA" initialRelated={[]} />,
    )
    expect(html).toBe('')
  })

  it('falls back to the client query without loader posts', () => {
    useRelatedBlogPosts.mockClear()
    useRelatedBlogPosts.mockReturnValueOnce({ data: [post('c', 'Treći povezani post')] })
    const html = renderToString(
      <RelatedPosts currentPost={post('current', 'Trenutni post')} locale="bs-BA" />,
    )
    expect(useRelatedBlogPosts).toHaveBeenCalledWith('bs-BA', 'Preduzetnistvo', 'current')
    expect(html).toContain('Treći povezani post')
  })
})
