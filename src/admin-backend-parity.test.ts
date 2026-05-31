import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readProjectFile = (...parts: string[]) =>
  readFileSync(resolve(process.cwd(), ...parts), 'utf-8')

describe('admin and backend Ponte parity', () => {
  it('uses admin categories in the blog editor', () => {
    const editor = readProjectFile(
      'src',
      'routes',
      '{-$locale}',
      'admin',
      'blog_.editor.tsx',
    )

    expect(editor).toContain('useAdminCategories')
    expect(editor).not.toContain('usePublicCategories')
  })

  it('keeps StartHN on the configured Microsoft tenant for OAuth', () => {
    const frontendOauth = readProjectFile('src', 'services', 'oauth.service.ts')
    const backendAuth = readProjectFile(
      'api',
      'Services',
      'Implementations',
      'AuthService.cs',
    )

    expect(frontendOauth).toContain(
      'https://login.microsoftonline.com/aa722524-5f12-410b-b06c-d5a8d54b1ddf/oauth2/v2.0/authorize',
    )
    expect(backendAuth).toContain(
      'https://login.microsoftonline.com/aa722524-5f12-410b-b06c-d5a8d54b1ddf/oauth2/v2.0/token',
    )
  })

  it('counts only published blog posts for public totals', () => {
    const repository = readProjectFile(
      'src',
      'server',
      'db',
      'repositories',
      'blog-post.ts',
    )
    const getCount = repository.match(/async getCount\(\)[\s\S]*?return result\[0\]\?\.count \?\? 0\s*\n\s*}/)?.[0]

    expect(getCount).toBeDefined()
    expect(getCount).toContain('where(eq(blogPosts.isPublished, 1))')
  })

  // NOTE: The Azure→D1 hourly force-sync safety net was intentionally removed when
  // D1 became the sole store and the Cosmos mirror was dropped (ForceSyncFunction
  // and the rest of the sync machinery were deleted). Azure now only hosts the AI
  // translate + chat + contact endpoints, so there is no sync net to assert.
})
