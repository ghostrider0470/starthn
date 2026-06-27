import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const publicPath = (...parts: Array<string>) =>
  resolve(process.cwd(), 'public', ...parts)

function readPublicFile(...parts: Array<string>) {
  return readFileSync(publicPath(...parts), 'utf-8')
}

describe('public SEO files', () => {
  it('allows public careers pages to be crawled', () => {
    const robots = readPublicFile('robots.txt')

    expect(robots).not.toMatch(/Disallow:\s*\/\*\/careers\b/)
  })

  it('points crawlers at the www Start HN sitemap origin', () => {
    // The sitemap is generated dynamically by the Worker (see src/server/sitemap.ts),
    // so there is no static public/sitemap.xml to assert against. robots.txt must
    // point at the www host to match the canonical/og:url origin (the apex 301s to
    // www, so an apex sitemap URL would add a needless redirect hop for crawlers).
    const robots = readPublicFile('robots.txt')

    expect(robots).toContain('Sitemap: https://www.starthn.ba/sitemap.xml')
    expect(robots).not.toContain('horizon-tech.io')
  })

  it('publishes a valid llms.txt file', () => {
    const llms = readPublicFile('llms.txt')

    expect(llms).toMatch(/^#\s+\S+/m)
    expect(llms).toMatch(/\[[^\]]+\]\(https:\/\/starthn\.ba[^)]*\)/)
  })
})
