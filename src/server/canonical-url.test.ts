import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  KNOWN_TOP_SEGMENTS,
  ORIGIN,
  redirectOrigin,
  resolveCanonicalRequest,
} from './canonical-url'
import { STATIC_PATHS } from './sitemap'
import { ALL_LANGUAGE_CODES } from '@/lib/languages'
import { PRIVATE_ROUTE_PREFIXES, SEO_PRIORITY_LOCALES } from '@/lib/seo'

const WWW = 'https://www.starthn.ba'
const APEX = 'https://starthn.ba'

const resolveUrl = (href: string, method = 'GET') =>
  resolveCanonicalRequest(new URL(href), method)

/** Location of the redirect for a www path, or the non-redirect result. */
function target(pathAndQuery: string, base = WWW) {
  const result = resolveUrl(`${base}${pathAndQuery}`)
  return result?.kind === 'redirect' ? result.location : result
}

describe('resolveCanonicalRequest — legacy WordPress URLs', () => {
  it('sends an apex legacy URL to its successor in ONE hop', () => {
    expect(target('/o-nama/', APEX)).toBe(`${ORIGIN}/bs-BA/about`)
    expect(target('/pokretanje-biznisa-u-bih/', APEX)).toBe(
      `${ORIGIN}/bs-BA/blog/how-to-start-a-business-in-bih-a-practical-guide-tips-from-experience-with-the-n1-tv-appearance`,
    )
  })

  it('drops the query on legacy hits', () => {
    expect(target('/kontakt/?utm_source=x')).toBe(`${ORIGIN}/bs-BA/contact`)
  })

  it('keeps the requested locale on legacy hits', () => {
    expect(target('/de-DE/kontakt')).toBe(`${ORIGIN}/de-DE/contact`)
    expect(target('/en/kontakt/')).toBe(`${ORIGIN}/en-US/contact`)
    expect(target('/hr-HR/o-nama')).toBe(`${ORIGIN}/hr-HR/about`)
  })

  it('maps the old service pages, with or without /service/', () => {
    expect(target('/service/racunovodstvene-knjigovodstvene/')).toBe(
      `${ORIGIN}/bs-BA/services/bookkeeping-accounting`,
    )
    expect(target('/bs-BA/revizijske-slicne-usluge')).toBe(
      `${ORIGIN}/bs-BA/services/tax-consulting`,
    )
    expect(target('/service/revizijske-slicne-usluge/feed/')).toBe(
      `${ORIGIN}/bs-BA/services/tax-consulting`,
    )
  })

  it('sends a bare service slug to its /services page', () => {
    expect(target('/en-US/business-consulting')).toBe(
      `${ORIGIN}/en-US/services/business-consulting`,
    )
    expect(target('/bs-BA/Tax-Consulting/')).toBe(
      `${ORIGIN}/bs-BA/services/tax-consulting`,
    )
  })

  it('maps the WordPress index files to the homepage', () => {
    expect(target('/index.php')).toBe(`${ORIGIN}/bs-BA`)
    expect(target('/index.html')).toBe(`${ORIGIN}/bs-BA`)
    expect(target('/bs-BA/index.php')).toBe(`${ORIGIN}/bs-BA`)
    expect(target('/en/index.php')).toBe(`${ORIGIN}/en-US`)
  })
})

describe('resolveCanonicalRequest — locales', () => {
  it('fixes bare languages and case variants of locale codes', () => {
    expect(target('/en/services')).toBe(`${ORIGIN}/en-US/services`)
    expect(target('/en')).toBe(`${ORIGIN}/en-US`)
    expect(target('/sr/about')).toBe(`${ORIGIN}/sr-Latn/about`)
    expect(target('/zh')).toBe(`${ORIGIN}/zh-Hans`)
    expect(target('/BS-BA/About/')).toBe(`${ORIGIN}/bs-BA/about`)
    expect(target('/DE-de/about')).toBe(`${ORIGIN}/de-DE/about`)
    expect(target('/sr-latn/blog')).toBe(`${ORIGIN}/sr-Latn/blog`)
  })

  it('leaves every visitor locale reachable (no locale is retired)', () => {
    for (const locale of ALL_LANGUAGE_CODES) {
      expect(target(`/${locale}`), locale).toBeNull()
      expect(target(`/${locale}/about`), locale).toBeNull()
    }
    expect(target('/sr-Latn/blog')).toBeNull()
    expect(target('/de-DE/about?a=1')).toBeNull()
  })

  it('keeps the query on non-legacy redirects', () => {
    expect(target('/DE-de/about?a=1')).toBe(`${ORIGIN}/de-DE/about?a=1`)
    expect(target('/about?utm_source=x')).toBe(`${ORIGIN}/bs-BA/about?utm_source=x`)
  })
})

describe('resolveCanonicalRequest — path normalization', () => {
  it('lowercases the path after the locale', () => {
    expect(target('/bs-BA/services/Tax-Consulting')).toBe(
      `${ORIGIN}/bs-BA/services/tax-consulting`,
    )
  })

  it('collapses repeated slashes and strips trailing ones', () => {
    expect(target('/bs-BA//about')).toBe(`${ORIGIN}/bs-BA/about`)
    expect(target('/bs-BA/about/')).toBe(`${ORIGIN}/bs-BA/about`)
    expect(target('/bs-BA/')).toBe(`${ORIGIN}/bs-BA`)
  })

  it('adds the default locale to prefix-less routes', () => {
    expect(target('/about')).toBe(`${ORIGIN}/bs-BA/about`)
    expect(target('/')).toBe(`${ORIGIN}/bs-BA`)
    expect(target('/', APEX)).toBe(`${ORIGIN}/bs-BA`)
    expect(target('/?ref=x')).toBe(`${ORIGIN}/bs-BA?ref=x`)
    expect(target('/blog/importance-of-entrepreneurship-programs')).toBe(
      `${ORIGIN}/bs-BA/blog/importance-of-entrepreneurship-programs`,
    )
  })

  it('leaves canonical URLs alone', () => {
    expect(target('/bs-BA')).toBeNull()
    expect(target('/bs-BA/login')).toBeNull()
    for (const locale of SEO_PRIORITY_LOCALES) {
      for (const path of STATIC_PATHS) {
        expect(target(`/${locale}${path}`), `/${locale}${path}`).toBeNull()
      }
    }
  })

  it('does not lowercase private routes', () => {
    expect(target('/bs-BA/Admin/Blog')).toBeNull()
    expect(target('/bs-BA/admin/Blog/')).toBe(`${ORIGIN}/bs-BA/admin/Blog`)
    for (const prefix of PRIVATE_ROUTE_PREFIXES) {
      expect(target(`/bs-BA${prefix}`), prefix).toBeNull()
    }
  })

  it('keeps percent-escapes as they are while lowercasing', () => {
    expect(target('/bs-BA/Blog/%C5%BEivot')).toBe(`${ORIGIN}/bs-BA/blog/%C5%BEivot`)
    expect(target('/bs-BA/blog/%C5%BEivot')).toBeNull()
  })
})

describe('resolveCanonicalRequest — 404 and pass-through', () => {
  it('404s prefix-less paths that are not a route', () => {
    expect(resolveUrl(`${WWW}/zzqqxx`)).toEqual({ kind: 'notFound' })
    expect(resolveUrl(`${WWW}/zzqqxx/about`)).toEqual({ kind: 'notFound' })
    expect(resolveUrl(`${APEX}/zzqqxx`)).toEqual({ kind: 'notFound' })
    expect(resolveUrl(`${WWW}/business-consultingx`)).toEqual({ kind: 'notFound' })
  })

  it('404s prefix-less files that Workers Assets did not serve', () => {
    expect(resolveUrl(`${WWW}/apple-touch-icon-precomposed.png`)).toEqual({
      kind: 'notFound',
    })
  })

  it('never redirects the OAuth callback on www', () => {
    expect(target('/auth/callback?code=A&state=B')).toBeNull()
    expect(target('/auth/callback?code=A&state=B', APEX)).toBe(
      `${ORIGIN}/auth/callback?code=A&state=B`,
    )
  })

  it('passes app paths through, only swapping apex for www', () => {
    expect(target('/api/blog')).toBeNull()
    expect(target('/api/blog?x=1', APEX)).toBe(`${ORIGIN}/api/blog?x=1`)
    expect(target('/img/blog-images/X.webp')).toBeNull()
    expect(target('/assets/main-xK8ZlQzF.js')).toBeNull()
    expect(target('/locales/bs-BA/common.json')).toBeNull()
    expect(target('/_serverFn/abc')).toBeNull()
    expect(target('/cdn-cgi/trace')).toBeNull()
  })

  it('passes root files and sitemaps through (the sitemap handler 410s unknown ones)', () => {
    expect(target('/sitemap.xml')).toBeNull()
    expect(target('/sitemap-bs-BA.xml')).toBeNull()
    expect(target('/sitemap-de-DE.xml')).toBeNull()
    expect(target('/robots.txt')).toBeNull()
    expect(target('/llms.txt')).toBeNull()
    expect(target('/sitemap.xml', APEX)).toBe(`${ORIGIN}/sitemap.xml`)
  })

  it('sends /favicon.ico to the PNG favicon', () => {
    expect(target('/favicon.ico')).toBe(`${ORIGIN}/favicon-32.png`)
    expect(target('/favicon.ico', APEX)).toBe(`${ORIGIN}/favicon-32.png`)
  })

  it('only swaps the host for non-GET requests', () => {
    expect(resolveUrl(`${WWW}/o-nama`, 'POST')).toBeNull()
    expect(resolveUrl(`${APEX}/api/auth/login`, 'POST')).toEqual({
      kind: 'redirect',
      location: `${ORIGIN}/api/auth/login`,
    })
    expect(resolveUrl(`${WWW}/o-nama`, 'HEAD')).toEqual({
      kind: 'redirect',
      location: `${ORIGIN}/bs-BA/about`,
    })
  })
})

describe('resolveCanonicalRequest — non-production hosts', () => {
  it('redirects on the same origin, never to production', () => {
    expect(target('/o-nama', 'http://localhost:8787')).toBe(
      'http://localhost:8787/bs-BA/about',
    )
    expect(target('/', 'https://starthn.example.workers.dev')).toBe(
      'https://starthn.example.workers.dev/bs-BA',
    )
    expect(target('/bs-BA', 'http://localhost:3000')).toBeNull()
  })

  it('leaves Vite dev-server internals alone', () => {
    expect(target('/@vite/client', 'http://localhost:3000')).toBeNull()
    expect(target('/src/styles.css', 'http://localhost:3000')).toBeNull()
    expect(target('/node_modules/.vite/deps/react.js', 'http://localhost:3000')).toBeNull()
  })

  it('redirectOrigin pins starthn.ba hosts to the www origin', () => {
    expect(redirectOrigin(new URL('https://starthn.ba/x'))).toBe(ORIGIN)
    expect(redirectOrigin(new URL('http://www.starthn.ba/x'))).toBe(ORIGIN)
    expect(redirectOrigin(new URL('http://localhost:8787/x'))).toBe(
      'http://localhost:8787',
    )
  })
})

describe('KNOWN_TOP_SEGMENTS', () => {
  it('matches the top-level route files under src/routes/{-$locale}', () => {
    const entries = readdirSync(resolve(process.cwd(), 'src/routes/{-$locale}'))
    const segments = new Set(
      entries
        .map((name) => name.replace(/\.tsx$/, '').split('.')[0].replace(/_$/, ''))
        .filter((segment) => segment !== '$' && segment !== 'index' && segment !== ''),
    )
    expect(segments).toEqual(new Set(KNOWN_TOP_SEGMENTS))
  })
})
