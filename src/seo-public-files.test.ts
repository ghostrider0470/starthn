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

  it('points crawlers at the Start HN sitemap origin', () => {
    const robots = readPublicFile('robots.txt')
    const sitemap = readPublicFile('sitemap.xml')

    expect(robots).toContain('Sitemap: https://starthn.ba/sitemap.xml')
    expect(sitemap).toContain('https://starthn.ba/sitemap-en-US.xml')
    expect(sitemap).not.toContain('horizon-tech.io')
  })

  it('publishes a valid llms.txt file', () => {
    const llms = readPublicFile('llms.txt')

    expect(llms).toMatch(/^#\s+\S+/m)
    expect(llms).toMatch(/\[[^\]]+\]\(https:\/\/starthn\.ba[^)]*\)/)
  })
})
