import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CONTACT_EMAIL,
  GOOGLE_BUSINESS_PROFILE_URL,
  ID_BROJ,
  LEGAL_NAME,
  MBS,
  PHONE_INTL,
  POSTAL_CODE,
  STREET,
} from '@/lib/business'
import {
  PRIVATE_ROUTE_PREFIXES,
  SEO_PRIORITY_LOCALES,
  isIndexableLocaleForPage,
} from '@/lib/seo'
import { STATIC_PATHS } from '@/server/sitemap'
import { SECURITY_HEADERS } from '@/server/security-headers'

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

  it('gives llms.txt the same NAP and legal identifiers as src/lib/business.ts', () => {
    const llms = readPublicFile('llms.txt')

    for (const value of [
      LEGAL_NAME,
      ID_BROJ,
      MBS,
      STREET,
      POSTAL_CODE,
      PHONE_INTL,
      CONTACT_EMAIL,
      GOOGLE_BUSINESS_PROFILE_URL,
    ]) {
      expect(llms, value).toContain(value)
    }
  })

  it('only quotes the prices already published on the home page', () => {
    const llms = readPublicFile('llms.txt')
    const prices = [...llms.matchAll(/(\d[\d.,]*)\s*KM/g)].map((m) => m[1])
    expect(prices.sort()).toEqual(['150', '300'])
    for (const locale of ['bs-BA', 'en-US']) {
      const landing = readPublicFile('locales', locale, 'landing.json')
      expect(landing, locale).toMatch(/\b300(?:[.,]00)?\s*KM/)
      expect(landing, locale).toMatch(/\b150(?:[.,]00)?\s*KM/)
    }
  })

  it('links llms.txt only to indexable pages of the kept locales', () => {
    const llms = readPublicFile('llms.txt')
    const links = [
      ...llms.matchAll(/\]\((https:\/\/www\.starthn\.ba[^)]*)\)/g),
    ].map((m) => new URL(m[1]).pathname)
    expect(links.length).toBeGreaterThan(20)

    for (const pathname of links) {
      const [, locale, ...rest] = pathname.split('/')
      const path = rest.length > 0 ? `/${rest.join('/')}` : ''
      expect(SEO_PRIORITY_LOCALES as ReadonlyArray<string>, pathname).toContain(
        locale,
      )
      expect(isIndexableLocaleForPage(path || '/', locale), pathname).toBe(true)
      const isListedPage =
        STATIC_PATHS.includes(path) || /^\/blog\/[a-z0-9-]+$/.test(path)
      expect(isListedPage, pathname).toBe(true)
    }
    for (const locale of SEO_PRIORITY_LOCALES) {
      expect(links, locale).toContain(`/${locale}`)
    }
  })
})

type HeaderRule = { pattern: string; headers: Record<string, string> }

/** public/_headers as rules: an unindented URL pattern, then indented "Name: value" lines. */
function parseHeadersFile(text: string): Array<HeaderRule> {
  const rules: Array<HeaderRule> = []
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: {} })
      continue
    }
    const match = /^\s+([^:]+):\s*(.*)$/.exec(line)
    expect(match, line).not.toBeNull()
    expect(
      rules.length,
      `header before any URL pattern: ${line}`,
    ).toBeGreaterThan(0)
    rules[rules.length - 1].headers[match![1].trim()] = match![2].trim()
  }
  return rules
}

/** Workers Assets pattern matching: one greedy "*" splat, otherwise exact. */
function matchesPattern(pattern: string, path: string): boolean {
  const source = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${source}$`).test(path)
}

describe('public/_headers', () => {
  const text = readPublicFile('_headers')
  const rules = parseHeadersFile(text)
  const rule = (pattern: string) => rules.find((r) => r.pattern === pattern)
  const headersFor = (path: string) =>
    rules.filter((r) => matchesPattern(r.pattern, path)).map((r) => r.headers)

  it('stays within the Workers Assets limits', () => {
    expect(rules.length).toBeLessThanOrEqual(100)
    for (const line of text.split('\n'))
      expect(line.length).toBeLessThanOrEqual(2000)
    for (const r of rules)
      expect(r.pattern.split('*').length, r.pattern).toBeLessThanOrEqual(2)
  })

  it('sends the Worker security headers on every static file', () => {
    expect(rule('/*')?.headers).toEqual(SECURITY_HEADERS)
  })

  it('never sets one header from two matching rules (values would be comma-joined)', () => {
    const files = readdirSync(publicPath(), {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile())
      .map((entry) =>
        `${entry.parentPath}/${entry.name}`
          .slice(publicPath().length)
          .replace(/\\/g, '/'),
      )
    for (const path of [...files, '/assets/main-abc123.js', '/llms.txt']) {
      const seen = new Map<string, number>()
      for (const headers of headersFor(path)) {
        for (const name of Object.keys(headers)) {
          const key = name.toLowerCase()
          seen.set(key, (seen.get(key) ?? 0) + 1)
        }
      }
      for (const [name, count] of seen) expect(count, `${path} ${name}`).toBe(1)
    }
  })

  it('serves llms.txt as UTF-8 text', () => {
    expect(rule('/llms.txt')?.headers).toEqual({
      'Content-Type': 'text/plain; charset=utf-8',
    })
  })

  it('caches site images for a year as immutable (renamed when changed)', () => {
    const imageFiles = readdirSync(publicPath(), {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile())
      .map((entry) =>
        `${entry.parentPath}/${entry.name}`
          .slice(publicPath().length)
          .replace(/\\/g, '/'),
      )
      .filter(
        (path) =>
          /^\/(hero|pages|clients|testimonials|promos|certificates)\//.test(
            path,
          ) || /^\/(logo-|why-start-hn|about-)[^/]*\.webp$/.test(path),
      )
    expect(imageFiles.length).toBeGreaterThan(50)
    for (const path of imageFiles) {
      const cacheControl = headersFor(path)
        .map((headers) => headers['Cache-Control'])
        .filter(Boolean)
      expect(cacheControl, path).toEqual([
        'public, max-age=31536000, immutable',
      ])
    }
  })

  it('caches the app icons and favicons for 30 days', () => {
    const iconFiles = readdirSync(publicPath()).filter((name) =>
      /^(icon-|favicon-|apple-touch-icon\.png$)/.test(name),
    )
    expect(iconFiles.length).toBeGreaterThanOrEqual(4)
    for (const name of iconFiles) {
      const cacheControl = headersFor(`/${name}`)
        .map((headers) => headers['Cache-Control'])
        .filter(Boolean)
      expect(cacheControl, name).toEqual(['public, max-age=2592000'])
    }
  })

  it('keeps hashed build assets immutable for a year', () => {
    expect(rule('/assets/*')?.headers['Cache-Control']).toBe(
      'public, max-age=31536000, immutable',
    )
  })
})
