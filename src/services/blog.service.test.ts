import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from './api'
import blogService from './blog.service'

const apiGet = vi.mocked(api.get)

describe('BlogService public translation requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches localized blog posts using full UI locale codes', async () => {
    apiGet.mockResolvedValue({
      data: { slug: 'test-post' },
      status: 200,
      headers: new Headers(),
    } as any)

    await blogService.fetchBlogPostBySlug('test-post', 'de-DE')

    expect(apiGet).toHaveBeenCalledWith('/blog/test-post', {
      params: { lang: 'de-DE' },
    })
  })

  it('does not send a translation parameter for the default English locale', async () => {
    apiGet.mockResolvedValue({
      data: { slug: 'test-post' },
      status: 200,
      headers: new Headers(),
    } as any)

    await blogService.fetchBlogPostBySlug('test-post', 'en-US')

    expect(apiGet).toHaveBeenCalledWith('/blog/test-post', { params: {} })
  })
})
