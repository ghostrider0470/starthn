import { describe, it, expect } from 'vitest'
import {
  normalizeLocale,
  transformBlogPost,
  transformBlogPostTranslation,
  transformUser,
  transformCategory,
  transformTag,
  transformCaseStudy,
  transformRole,
} from './migrate-cosmos-to-d1'

describe('normalizeLocale', () => {
  it('converts bs to bs-BA', () => expect(normalizeLocale('bs')).toBe('bs-BA'))
  it('converts de to de-DE', () => expect(normalizeLocale('de')).toBe('de-DE'))
  it('converts hr to hr-HR', () => expect(normalizeLocale('hr')).toBe('hr-HR'))
  it('converts pt to pt-BR', () => expect(normalizeLocale('pt')).toBe('pt-BR'))
  it('leaves zh-Hans unchanged', () => expect(normalizeLocale('zh-Hans')).toBe('zh-Hans'))
  it('leaves en-US unchanged', () => expect(normalizeLocale('en-US')).toBe('en-US'))
  it('leaves unknown codes unchanged', () => expect(normalizeLocale('fr-CA')).toBe('fr-CA'))
})

describe('transformBlogPost', () => {
  const doc = {
    id: 'abc123',
    slug: 'my-post',
    title: 'My Post',
    excerpt: 'An excerpt',
    content: [{ type: 'paragraph', text: 'Hello' }],
    isPublished: true,
    isFeatured: false,
    publishedAt: '2026-01-01T00:00:00Z',
    readTime: 5,
    category: 'tech',
    subcategory: null,
    coverImage: null,
    bannerImage: null,
    authorId: 'user1',
    author: 'Jane Doe',
    tags: ['react', 'ts'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  }

  it('maps fields to D1 shape', () => {
    const result = transformBlogPost(doc)
    expect(result!.post.id).toBe('abc123')
    expect(result!.post.slug).toBe('my-post')
    expect(result!.post.isPublished).toBe(1)
    expect(result!.post.isFeatured).toBe(0)
    expect(typeof result!.post.content).toBe('string')
    expect(result!.tagSlugs).toEqual(['react', 'ts'])
  })

  it('skips deleted documents', () => {
    expect(transformBlogPost({ ...doc, _deleted: true })).toBeNull()
  })
})

describe('transformBlogPostTranslation', () => {
  it('normalizes lang field to BCP47', () => {
    const doc = {
      id: 'my-post:bs',
      postSlug: 'my-post',
      lang: 'bs',
      title: 'Moj post',
      excerpt: 'Odlomak',
      content: [],
      isAutoTranslated: true,
      translatedAt: '2026-01-01T00:00:00Z',
    }
    const result = transformBlogPostTranslation(doc)
    expect(result?.locale).toBe('bs-BA')
    expect(result?.postSlug).toBe('my-post')
  })

  it('returns null for deleted docs', () => {
    expect(transformBlogPostTranslation({ id: 'x', _deleted: true })).toBeNull()
  })
})

describe('transformUser', () => {
  it('maps Cosmos user to D1 users row', () => {
    const doc = {
      id: 'user1',
      email: 'a@b.com',
      passwordHash: 'hash',
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: true,
      socialLinks: { linkedIn: 'https://li.com', twitter: null, gitHub: null, website: null },
      roles: ['MasterAdmin'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const result = transformUser(doc)
    expect(result?.user.email).toBe('a@b.com')
    expect(result?.user.isActive).toBe(1)
    expect(result?.user.socialLinkedin).toBe('https://li.com')
    expect(result?.roleNames).toEqual(['MasterAdmin'])
  })
})

describe('transformCategory', () => {
  it('normalizes translation locale keys', () => {
    const doc = {
      id: 'cat1',
      slug: 'tech',
      label: 'Technology',
      translations: { bs: 'Tehnologija', de: 'Technologie' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const result = transformCategory(doc)
    expect(result?.category.slug).toBe('tech')
    expect(result?.translations.find(t => t.locale === 'bs-BA')?.label).toBe('Tehnologija')
    expect(result?.translations.find(t => t.locale === 'de-DE')?.label).toBe('Technologie')
  })
})

describe('transformCaseStudy', () => {
  it('maps decisions and results', () => {
    const doc = {
      id: 'cs1',
      slug: 'case-1',
      title: 'Case Study',
      isPublished: false,
      isFeatured: false,
      architectureDecisions: [{ decision: 'Use microservices', rationale: 'Scale' }],
      results: [{ metric: 'Latency', value: '50ms', description: 'p99' }],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const result = transformCaseStudy(doc)
    expect(result?.caseStudy.slug).toBe('case-1')
    expect(result?.decisions).toHaveLength(1)
    expect(result?.results).toHaveLength(1)
  })
})
