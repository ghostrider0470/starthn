import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRIVATE_ROUTE_PREFIXES } from '@/lib/seo'

const publicPath = (...parts: Array<string>) =>
  resolve(process.cwd(), 'public', ...parts)

function readPublicFile(...parts: Array<string>) {
  return readFileSync(publicPath(...parts), 'utf-8')
}

// Google's robots.txt path matching: "*" = any chars, trailing "$" = end of URL.
// Only Disallow rules exist in our file, so "blocked" = any Disallow matches.
function isBlockedByRobots(robots: string, url: string): boolean {
  return robots
    .split('\n')
    .map((line) => /^Disallow:\s*(\S+)/.exec(line)?.[1])
    .filter((rule): rule is string => !!rule)
    .some((rule) => {
      const anchored = rule.endsWith('$')
      const body = (anchored ? rule.slice(0, -1) : rule)
        .replace(/[.+?^{}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
      return new RegExp(`^${body}${anchored ? '$' : ''}`).test(url)
    })
}

describe('robots.txt rules', () => {
  const robots = readPublicFile('robots.txt')

  it('blocks every private route, bare and locale-prefixed', () => {
    for (const prefix of PRIVATE_ROUTE_PREFIXES) {
      for (const url of [
        prefix,
        `${prefix}/sub`,
        `${prefix}?next=/`,
        `/bs-BA${prefix}`,
        `/en-US${prefix}/sub`,
        `/sr-Latn${prefix}?next=/`,
      ]) {
        expect(isBlockedByRobots(robots, url), url).toBe(true)
      }
    }
  })

  it('never blocks public content that merely starts with a private word', () => {
    for (const url of [
      '/',
      '/bs-BA',
      '/bs-BA/services/business-consulting',
      '/bs-BA/blog/register-a-company-in-bih',
      '/bs-BA/blog/profile-of-a-good-accountant',
      '/bs-BA/services/administrative-support',
      '/en-US/blog/login-security-tips',
      '/sitemap.xml',
      '/assets/styles.css',
      '/img/hero.webp',
      '/api/blog',
    ]) {
      expect(isBlockedByRobots(robots, url), url).toBe(false)
    }
  })

  it('leaves hacked-spam URLs crawlable so Google can see the 410', () => {
    expect(isBlockedByRobots(robots, '/items/Y156399317/')).toBe(false)
    expect(isBlockedByRobots(robots, '/cate-136-177')).toBe(false)
  })
})

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
    // Links use the canonical www host (the apex only 301s to it).
    expect(llms).toMatch(/\[[^\]]+\]\(https:\/\/www\.starthn\.ba\/[^)]*\)/)
    expect(llms).not.toMatch(/\(https:\/\/starthn\.ba/)
  })

  it('gives llms.txt the Google Business Profile NAP and the D2 email', () => {
    const llms = readPublicFile('llms.txt')

    expect(llms).toContain('Ibrahima Ljubovića 47, 71210 Ilidža')
    expect(llms).toContain('+387 61 221 368')
    expect(llms).toContain('https://maps.google.com/?cid=6152645102359996777')
    expect(llms).toContain('klijenti@starthn.ba')
    expect(llms).not.toContain('info@starthn.ba')
  })
})
