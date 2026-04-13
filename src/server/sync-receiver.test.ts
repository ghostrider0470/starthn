import { describe, it, expect } from 'vitest'
import { buildUpsertStatements } from './sync-receiver'

describe('buildUpsertStatements', () => {
  it('returns empty for unknown entity', () => {
    const result = buildUpsertStatements('unknown', [])
    expect(result).toEqual([])
  })

  // ─── Soft-delete handling ──────────────────────────────────

  it('generates DELETE for soft-deleted blog post', () => {
    const items = [{ id: 'post-1', _deleted: true }]
    const stmts = buildUpsertStatements('blogPosts', items)
    expect(stmts).toHaveLength(3)
    expect(stmts[0].sql).toContain('DELETE FROM blog_post_tags')
    expect(stmts[1].sql).toContain('DELETE FROM blog_post_translations')
    expect(stmts[2].sql).toContain('DELETE FROM blog_posts')
  })

  it('generates DELETE for soft-deleted user', () => {
    const items = [{ id: 'user-1', _deleted: true }]
    const stmts = buildUpsertStatements('users', items)
    expect(stmts).toHaveLength(3)
    expect(stmts[2].sql).toContain('DELETE FROM users')
  })

  it('generates DELETE for soft-deleted case study with children', () => {
    const items = [{ id: 'cs-1', _deleted: true }]
    const stmts = buildUpsertStatements('caseStudies', items)
    expect(stmts).toHaveLength(4)
    expect(stmts[0].sql).toContain('DELETE FROM case_study_decisions')
    expect(stmts[1].sql).toContain('DELETE FROM case_study_results')
    expect(stmts[2].sql).toContain('DELETE FROM case_study_translations')
    expect(stmts[3].sql).toContain('DELETE FROM case_studies')
  })

  // ─── Blog posts ────────────────────────────────────────────

  it('builds blogPosts upsert SQL with tags', () => {
    const items = [
      {
        id: 'post-1',
        slug: 'test-slug',
        title: 'Test Post',
        excerpt: 'An excerpt',
        isPublished: true,
        isFeatured: false,
        publishedAt: '2026-04-09T00:00:00Z',
        readTime: 5,
        category: 'tech',
        subcategory: null,
        coverImage: null,
        bannerImage: null,
        authorId: 'author-1',
        author: 'John',
        createdAt: '2026-04-09T00:00:00Z',
        updatedAt: '2026-04-09T00:00:00Z',
        content: [{ type: 'paragraph', text: 'Hello' }],
        tags: ['javascript', 'react'],
      },
    ]
    const stmts = buildUpsertStatements('blogPosts', items)
    // 1 upsert + 1 delete tags + 2 insert tags = 4
    expect(stmts).toHaveLength(4)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO blog_posts')
    expect(stmts[1].sql).toContain('DELETE FROM blog_post_tags')
    expect(stmts[2].sql).toContain('INSERT OR IGNORE INTO blog_post_tags')
  })

  it('clears tags when tags array is empty', () => {
    const items = [
      {
        id: 'post-1',
        slug: 'test-slug',
        title: 'Test',
        tags: [],
        content: [],
      },
    ]
    const stmts = buildUpsertStatements('blogPosts', items)
    // 1 upsert + 1 delete tags (no inserts) = 2
    expect(stmts).toHaveLength(2)
    expect(stmts[1].sql).toContain('DELETE FROM blog_post_tags')
  })

  // ─── Users ─────────────────────────────────────────────────

  it('builds users with nested socialLinks', () => {
    const items = [
      {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        slug: 'test-user',
        socialLinks: {
          linkedIn: 'https://linkedin.com/in/test',
          twitter: 'https://twitter.com/test',
          gitHub: 'https://github.com/test',
          website: 'https://test.com',
        },
        roles: ['admin', 'editor'],
      },
    ]
    const stmts = buildUpsertStatements('users', items)
    // 1 upsert + 1 delete roles + 2 insert roles = 4
    expect(stmts).toHaveLength(4)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO users')
    // Check social links are at the right positions (indices 14-17)
    expect(stmts[0].params[14]).toBe('https://linkedin.com/in/test')
    expect(stmts[0].params[15]).toBe('https://twitter.com/test')
    expect(stmts[0].params[16]).toBe('https://github.com/test')
    expect(stmts[0].params[17]).toBe('https://test.com')
  })

  it('handles missing socialLinks gracefully', () => {
    const items = [
      {
        id: 'user-1',
        email: 'test@example.com',
        isActive: true,
        roles: [],
      },
    ]
    const stmts = buildUpsertStatements('users', items)
    // Social link params should be undefined, not crash
    expect(stmts[0].params[14]).toBeUndefined()
    expect(stmts[0].params[15]).toBeUndefined()
  })

  // ─── Categories & Tags ─────────────────────────────────────

  it('builds categories with inline translations', () => {
    const items = [
      {
        id: 'cat-1',
        slug: 'tech',
        label: 'Technology',
        parentId: null,
        createdAt: '2026-04-09T00:00:00Z',
        updatedAt: '2026-04-09T00:00:00Z',
        translations: { 'de-DE': 'Technologie', 'fr-FR': 'Technologie' },
      },
    ]
    const stmts = buildUpsertStatements('categories', items)
    // 1 upsert + 1 delete translations + 2 insert translations = 4
    expect(stmts).toHaveLength(4)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO categories')
    expect(stmts[1].sql).toContain('DELETE FROM category_translations')
  })

  it('builds tags with inline translations', () => {
    const items = [
      {
        id: 'tag-1',
        slug: 'react',
        label: 'React',
        createdAt: '2026-04-09T00:00:00Z',
        updatedAt: '2026-04-09T00:00:00Z',
        translations: { 'de-DE': 'React' },
      },
    ]
    const stmts = buildUpsertStatements('tags', items)
    // 1 upsert + 1 delete translations + 1 insert translation = 3
    expect(stmts).toHaveLength(3)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO tags')
  })

  // ─── Case studies with children ────────────────────────────

  it('builds caseStudies with decisions and results', () => {
    const items = [
      {
        id: 'cs-1',
        slug: 'case-1',
        title: 'Case Study',
        client: 'Acme',
        industry: 'tech',
        isPublished: true,
        isFeatured: false,
        createdAt: '2026-04-09T00:00:00Z',
        updatedAt: '2026-04-09T00:00:00Z',
        architectureDecisions: [
          { decision: 'Use microservices', rationale: 'Scalability' },
          { decision: 'Use event sourcing', rationale: 'Audit trail' },
        ],
        results: [
          { metric: 'Latency', value: '50ms', description: 'p99 latency' },
        ],
      },
    ]
    const stmts = buildUpsertStatements('caseStudies', items)
    // 1 upsert + 1 delete decisions + 2 insert decisions + 1 delete results + 1 insert result = 6
    expect(stmts).toHaveLength(6)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO case_studies')
    expect(stmts[1].sql).toContain('DELETE FROM case_study_decisions')
    expect(stmts[2].sql).toContain('INSERT INTO case_study_decisions')
    expect(stmts[2].params).toContain('Use microservices')
    expect(stmts[4].sql).toContain('DELETE FROM case_study_results')
    expect(stmts[5].sql).toContain('INSERT INTO case_study_results')
    expect(stmts[5].params).toContain('Latency')
  })

  // ─── Roles ─────────────────────────────────────────────────

  it('builds roles upsert SQL', () => {
    const items = [
      {
        id: 'role-1',
        name: 'admin',
        slug: 'admin',
        description: 'Administrator',
        permissions: ['manage:blog', 'manage:users'],
        isSystem: true,
        createdAt: '2026-04-09T00:00:00Z',
        updatedAt: '2026-04-09T00:00:00Z',
      },
    ]
    const stmts = buildUpsertStatements('roles', items)
    expect(stmts).toHaveLength(1)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO roles')
    expect(stmts[0].params).toContain('["manage:blog","manage:users"]')
  })

  // ─── Translations ──────────────────────────────────────────

  it('builds blogPostTranslations using slug lookup', () => {
    const items = [
      {
        id: 'test-slug:de-DE',
        postSlug: 'test-slug',
        lang: 'de-DE',
        title: 'Testbeitrag',
        excerpt: 'Ein Auszug',
        content: [{ type: 'paragraph', text: 'Hallo' }],
        isAutoTranslated: true,
        translatedAt: '2026-04-09T00:00:00Z',
      },
    ]
    const stmts = buildUpsertStatements('blogPostTranslations', items)
    expect(stmts).toHaveLength(1)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO blog_post_translations')
    expect(stmts[0].sql).toContain('FROM blog_posts bp WHERE bp.slug = ?')
    expect(stmts[0].params).toContain('test-slug')
    expect(stmts[0].params).toContain('de-DE')
  })

  it('builds userPageTranslations upsert SQL', () => {
    const items = [
      {
        id: 'user-1:de-DE',
        userId: 'user-1',
        lang: 'de-DE',
        bio: 'Eine Bio',
        pageContent: [],
        isAutoTranslated: true,
        translatedAt: '2026-04-09T00:00:00Z',
      },
    ]
    const stmts = buildUpsertStatements('userPageTranslations', items)
    expect(stmts).toHaveLength(1)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO user_page_translations')
  })

  it('builds processedImages upsert SQL', () => {
    const items = [
      {
        path: 'blog-images/2026/04/test.png',
        format: 'webp',
        widths: [400, 800, 1200],
        processedAt: '2026-04-09T00:00:00Z',
        source: 'backend',
      },
    ]
    const stmts = buildUpsertStatements('processedImages', items)
    expect(stmts).toHaveLength(1)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO processed_images')
  })

  it('handles multiple items in a batch', () => {
    const items = [
      { id: 'tag-1', slug: 'react', label: 'React', createdAt: '', updatedAt: '', translations: {} },
      { id: 'tag-2', slug: 'vue', label: 'Vue', createdAt: '', updatedAt: '', translations: {} },
    ]
    const stmts = buildUpsertStatements('tags', items)
    // 2 items x (1 upsert + 1 delete translations) = 4
    expect(stmts).toHaveLength(4)
  })

  it('generates DELETE for soft-deleted translation', () => {
    const items = [{ id: 'slug:de-DE', _deleted: true }]
    const stmts = buildUpsertStatements('blogPostTranslations', items)
    expect(stmts).toHaveLength(1)
    expect(stmts[0].sql).toContain('DELETE FROM blog_post_translations WHERE id = ?')
  })
})
