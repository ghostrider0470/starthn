import { describe, expect, it } from 'vitest'
import { createDb } from '../client'
import { BlogPostRepository } from './blog-post'

interface Captured {
  sql: string
  params: Array<unknown>
}

/** A D1 binding that records every statement and returns no rows. */
function fakeD1(captured: Array<Captured>): D1Database {
  const prepare = (sql: string) => {
    const entry: Captured = { sql, params: [] }
    captured.push(entry)
    const statement = {
      bind: (...params: Array<unknown>) => {
        entry.params = params
        return statement
      },
      all: () => Promise.resolve({ results: [], success: true, meta: {} }),
      raw: () => Promise.resolve([]),
      first: () => Promise.resolve(null),
      run: () => Promise.resolve({ results: [], success: true, meta: {} }),
    }
    return statement
  }
  return { prepare } as unknown as D1Database
}

const READABLE =
  /\("blog_posts"\."lang" = \? OR "blog_post_translations"\."id" IS NOT NULL\)/

function repoWith(captured: Array<Captured>) {
  return new BlogPostRepository(createDb(fakeD1(captured)))
}

describe('BlogPostRepository listings', () => {
  it('getPublished lists only posts readable in the locale (the rule the post route 404s on)', async () => {
    const captured: Array<Captured> = []
    await repoWith(captured).getPublished('hr-HR', 1, 9, { category: 'porezi' })

    expect(captured).toHaveLength(1)
    const [{ sql, params }] = captured
    expect(sql).toMatch(/left join "blog_post_translations"/i)
    expect(sql).toMatch(READABLE)
    expect(params.filter((param) => param === 'hr-HR')).toHaveLength(2)
  })

  it('getCount counts the same posts as getPublished', async () => {
    const captured: Array<Captured> = []
    const count = await repoWith(captured).getCount({}, 'de-DE')

    expect(count).toBe(0)
    const [{ sql, params }] = captured
    expect(sql).toMatch(/left join "blog_post_translations"/i)
    expect(sql).toMatch(READABLE)
    expect(params.filter((param) => param === 'de-DE')).toHaveLength(2)
  })

  it('defaults to en-US like getBySlug', async () => {
    const captured: Array<Captured> = []
    const repo = repoWith(captured)
    await repo.getPublished()
    await repo.getCount()

    for (const { sql, params } of captured) {
      expect(sql).toMatch(READABLE)
      expect(params.filter((param) => param === 'en-US')).toHaveLength(2)
    }
  })
})
