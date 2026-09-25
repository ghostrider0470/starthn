// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  ALL_RESOURCES,
  BASE_RESOURCES,
  I18N_NAMESPACES,
  dedupeSpecs,
  missingNamespaces,
  parseSpec,
  resourcesForPath,
  selectResources,
} from './i18n-route-namespaces'
import type { ResourceSpec } from './i18n-route-namespaces'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const ROUTES_DIR = path.join(SRC, 'routes', '{-$locale}')
const LOCALES_DIR = path.join(ROOT, 'public', 'locales')

function readBundles(locale: string): Record<string, unknown> {
  return Object.fromEntries(
    I18N_NAMESPACES.map((ns) => [
      ns,
      JSON.parse(
        fs.readFileSync(path.join(LOCALES_DIR, locale, `${ns}.json`), 'utf8'),
      ) as unknown,
    ]),
  )
}

describe('resourcesForPath', () => {
  it('gives the homepage the shell plus landing', () => {
    expect(resourcesForPath('/bs-BA')).toEqual([
      'common',
      'seo',
      'pages:error',
      'landing',
    ])
    expect(resourcesForPath('/')).toEqual(resourcesForPath('/en-US'))
  })

  it('never sends auth strings to public pages', () => {
    for (const pathname of [
      '/bs-BA',
      '/bs-BA/services',
      '/hr-HR/services/bookkeeping-accounting',
      '/bs-BA/contact',
      '/en-US/about',
      '/bs-BA/blog',
      '/bs-BA/blog/some-post',
      '/zh-Hans/careers',
      '/bs-BA/privacy',
    ]) {
      const namespaces = resourcesForPath(pathname).map((s) => parseSpec(s)[0])
      expect(namespaces, pathname).not.toContain('auth')
      expect(namespaces, pathname).toEqual(
        expect.arrayContaining(['common', 'seo']),
      )
    }
  })

  it('sends only the page subtree of `pages` to a company page', () => {
    expect(resourcesForPath('/bs-BA/contact')).toEqual([
      'common',
      'seo',
      'pages:error',
      'landing:chat',
      'pages:contact',
    ])
    expect(resourcesForPath('/bs-BA/mission-vision')).toContain(
      'pages:missionVision',
    )
  })

  it('matches case-insensitively and with a compound locale prefix', () => {
    expect(resourcesForPath('/bs-BA/CONTACT')).toEqual(
      resourcesForPath('/bs-BA/contact'),
    )
    expect(resourcesForPath('/zh-Hans/contact')).toEqual(
      resourcesForPath('/bs-BA/contact'),
    )
  })

  it('gives every namespace to private, auth and unknown paths', () => {
    for (const pathname of [
      '/bs-BA/admin',
      '/bs-BA/admin/blog/editor',
      '/bs-BA/login',
      '/bs-BA/profile',
      '/bs-BA/auth/callback',
      '/bs-BA/no-such-page',
      '/bs-BA/blog/a/b',
    ]) {
      expect(resourcesForPath(pathname), pathname).toEqual([...ALL_RESOURCES])
    }
  })
})

describe('dedupeSpecs / parseSpec', () => {
  it('splits namespace and key path', () => {
    expect(parseSpec('landing')).toEqual(['landing', null])
    expect(parseSpec('pages:error.runtime')).toEqual(['pages', 'error.runtime'])
  })

  it('drops subtrees of namespaces included in full, and duplicates', () => {
    expect(
      dedupeSpecs(['landing:chat', 'common', 'landing', 'common', 'pages:a']),
    ).toEqual(['common', 'landing', 'pages:a'])
  })
})

describe('selectResources', () => {
  const bundles = {
    common: { nav: { home: 'Početna' } },
    pages: {
      contact: { title: 'Kontakt' },
      error: { runtime: { title: 'Greška', retry: 'Pokušaj ponovo' } },
      admin: { secret: 'x' },
    },
    auth: { login: { title: 'Prijava' } },
  }

  it('copies whole namespaces and only the listed subtrees', () => {
    const { resources, complete } = selectResources(bundles, [
      'common',
      'pages:contact',
      'pages:error.runtime.title',
    ])
    expect(complete).toEqual(['common'])
    expect(resources).toEqual({
      common: { nav: { home: 'Početna' } },
      pages: {
        contact: { title: 'Kontakt' },
        error: { runtime: { title: 'Greška' } },
      },
    })
  })

  it('skips missing namespaces and subtrees', () => {
    expect(
      selectResources(bundles, ['blog', 'pages:nope', 'services:items.x']),
    ).toEqual({ resources: {}, complete: [] })
    expect(selectResources(undefined, ['common'])).toEqual({
      resources: {},
      complete: [],
    })
  })

  it('does not mutate the source bundles', () => {
    const before = JSON.stringify(bundles)
    selectResources(bundles, ['pages:contact', 'pages:error'])
    expect(JSON.stringify(bundles)).toBe(before)
  })
})

describe('missingNamespaces', () => {
  const complete = new Set(['common'])
  const present = new Set(['pages:contact'])
  const isComplete = (ns: string) => complete.has(ns)
  const hasSubtree = (ns: string, p: string) => present.has(`${ns}:${p}`)

  it('lists incomplete whole namespaces and absent subtrees once', () => {
    expect(
      missingNamespaces(
        ['common', 'pages:contact', 'pages:about', 'landing', 'landing:chat'],
        isComplete,
        hasSubtree,
      ),
    ).toEqual(['pages', 'landing'])
  })

  it('is empty when everything is there', () => {
    expect(
      missingNamespaces(['common', 'pages:contact'], isComplete, hasSubtree),
    ).toEqual([])
  })
})

describe('dehydrated payload size (bs-BA)', () => {
  const bundles = readBundles('bs-BA')
  const gz = (value: unknown) => gzipSync(JSON.stringify(value)).length
  const full = gz(bundles)

  it.each([
    ['/bs-BA', 0.45],
    ['/bs-BA/services/bookkeeping-accounting', 0.45],
    ['/bs-BA/contact', 0.3],
    ['/bs-BA/blog/some-post', 0.3],
  ])('%s ships under %s of the full catalog', (pathname, ratio) => {
    const { resources } = selectResources(bundles, resourcesForPath(pathname))
    expect(gz(resources)).toBeLessThan(full * ratio)
    expect(resources).not.toHaveProperty('auth')
    expect(
      Object.hasOwn(resources, 'pages') && Object.hasOwn(resources.pages, 'admin'),
    ).toBe(false)
  })

  it('keeps the shell strings every page renders', () => {
    const { resources } = selectResources(bundles, BASE_RESOURCES)
    expect(resources.common).toEqual(bundles.common)
    expect(resources.seo).toEqual(bundles.seo)
    expect(resources.pages).toHaveProperty('error')
    expect(resources.landing).toHaveProperty('chat.openChat')
  })
})

// ─── Coverage: every string a page renders is in its dehydrated set ────────
//
// Walks each route file's import graph (static and dynamic imports under
// src/) and collects the translation namespaces and top-level keys it reads:
// useTranslation('ns' | ['ns', ...]), getFixedT(lng, 'ns'), t('key'),
// t('ns:key'), t(`key.${x}`) and { ns: 'x' } options. A page whose entry in
// i18n-route-namespaces.ts misses one of them would hydrate with raw keys.

type Usage = Map<string, Set<string>> // namespace → top-level keys ('*' = all)

const IMPORT_RE =
  /(?:^|[\s;])(?:import|export)\s+(?!type\s)(?:[^'"`;]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
/** head() helpers: exact lookups that fall back, never a raw key. */
const IGNORED_FILES = new Set(
  ['lib/seo.ts', 'lib/seo-meta.ts'].map((f) => path.join(SRC, f)),
)

function resolveImport(spec: string, from: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
  else return null
  for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts']) {
    const file = base + ext
    if (/\.(tsx?|jsx?)$/.test(file) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      return file
    }
  }
  return null
}

function add(usage: Usage, ns: string, key: string) {
  const keys = usage.get(ns) ?? new Set<string>()
  keys.add(key)
  usage.set(ns, keys)
}

function fileUsage(source: string): Usage {
  const usage: Usage = new Map()
  const defaults = new Set<string>()
  for (const m of source.matchAll(/useTranslation\(\s*(?:\[\s*)?(['"])([\w-]+)\1/g)) {
    defaults.add(m[2])
  }
  if (/useTranslation\(\s*\)/.test(source)) defaults.add('common')
  for (const m of source.matchAll(/getFixedT\([^,]+,\s*(['"])([\w-]+)\1/g)) {
    defaults.add(m[2])
  }
  for (const m of source.matchAll(/\bns:\s*(['"])([\w-]+)\1/g)) add(usage, m[2], '*')

  for (const m of source.matchAll(/\bt\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g)) {
    const key = m[2]
    const colon = key.indexOf(':')
    const firstBreak = key.search(/[.$]/)
    const prefixed = colon > 0 && (firstBreak === -1 || colon < firstBreak)
    const namespaces = prefixed ? [key.slice(0, colon)] : [...defaults]
    const rest = prefixed ? key.slice(colon + 1) : key
    const top = rest.startsWith('${') ? '*' : rest.split('.')[0]
    for (const ns of namespaces) add(usage, ns, top)
  }
  if (/\bt\(\s*[A-Za-z_$]/.test(source)) {
    for (const ns of defaults) add(usage, ns, '*')
  }
  return usage
}

function graphUsage(entry: string): Usage {
  const usage: Usage = new Map()
  const seen = new Set<string>()
  const stack = [entry]
  while (stack.length) {
    const file = stack.pop() as string
    if (seen.has(file)) continue
    seen.add(file)
    const source = fs.readFileSync(file, 'utf8')
    if (!IGNORED_FILES.has(file)) {
      for (const [ns, keys] of fileUsage(source)) {
        for (const key of keys) add(usage, ns, key)
      }
    }
    for (const m of source.matchAll(IMPORT_RE)) {
      const spec = m.slice(1).find(Boolean)
      const resolved = spec ? resolveImport(spec, file) : null
      if (resolved) stack.push(resolved)
    }
  }
  return usage
}

function uncovered(usage: Usage, specs: ReadonlyArray<ResourceSpec>): Array<string> {
  const whole = new Set<string>()
  const subtrees = new Set<string>()
  for (const spec of specs) {
    const [ns, p] = parseSpec(spec)
    if (p === null) whole.add(ns)
    else subtrees.add(`${ns}:${p.split('.')[0]}`)
  }
  const gaps: Array<string> = []
  for (const [ns, keys] of usage) {
    if (whole.has(ns) || !(I18N_NAMESPACES as ReadonlyArray<string>).includes(ns)) {
      continue
    }
    for (const key of keys) {
      if (key === '*' || !subtrees.has(`${ns}:${key}`)) gaps.push(`${ns}:${key}`)
    }
  }
  return gaps.sort()
}

/** "blog.$slug.tsx" → "/blog/x", "services.index.tsx" → "/services". */
function routePath(file: string): string {
  const rel = path.relative(ROUTES_DIR, file).replace(/\.tsx$/, '')
  const segments = rel
    .split(/[/.]/)
    .filter((s) => s !== 'index')
    .map((s) => (s === '$' ? 'no-such-page' : s.startsWith('$') ? 'x' : s))
    .map((s) => s.replace(/_$/, ''))
  return `/bs-BA/${segments.join('/')}`.replace(/\/$/, '')
}

function routeFiles(dir: string): Array<string> {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return routeFiles(full)
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [full] : []
  })
}

describe('route resource coverage', () => {
  it('finds the strings the analysis is expected to see', () => {
    const contact = graphUsage(path.join(ROUTES_DIR, 'contact.tsx'))
    expect(contact.get('pages')).toContain('contact')
    const home = graphUsage(path.join(ROUTES_DIR, 'index.tsx'))
    expect(home.get('landing')?.size).toBeGreaterThan(5)
  })

  it('covers the site shell with BASE_RESOURCES', () => {
    const shell = new Map<string, Set<string>>()
    for (const entry of ['routes/__root.tsx', 'routes/{-$locale}.tsx']) {
      for (const [ns, keys] of graphUsage(path.join(SRC, entry))) {
        for (const key of keys) add(shell, ns, key)
      }
    }
    expect(uncovered(shell, BASE_RESOURCES)).toEqual([])
  })

  const files = routeFiles(ROUTES_DIR)

  it.each(files.map((f) => [path.relative(ROUTES_DIR, f), f]))(
    '%s',
    (_name, file) => {
      const pathname = routePath(file)
      const specs = resourcesForPath(pathname)
      expect(uncovered(graphUsage(file), specs), pathname).toEqual([])
    },
  )
})
