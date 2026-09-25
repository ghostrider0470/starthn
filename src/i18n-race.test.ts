// @vitest-environment node
//
// Regression tests for the SSR i18n race (audit finding F02). The Worker
// shares one module-level i18next instance between concurrent requests, so
// server code must never switch its language: each request renders with its
// own clone (see getRouter() in src/router.tsx), and loadTranslationsForSSR
// only fills the shared resource store. The node environment makes src/i18n.ts
// take its server path (no `window`).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n, { I18N_NAMESPACES, loadTranslationsForSSR } from '@/i18n'
import { setAssets } from '@/server/assets-context'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

beforeAll(() => {
  i18n.addResourceBundle('bs-BA', 'common', { x: 'bosanski' }, true, true)
  i18n.addResourceBundle('en-US', 'common', { x: 'english' }, true, true)
})

describe('per-request i18n clones', () => {
  it('keep their own language while running concurrently', async () => {
    const globalLanguageBefore = i18n.language
    const a = i18n.cloneInstance({ initAsync: false })
    const b = i18n.cloneInstance({ initAsync: false })

    // `a` awaits I/O between its language switch and its render, the shape of
    // the blog loaders that exposed the race; `b` switches in the meantime.
    const [aValue, bValue] = await Promise.all([
      a
        .changeLanguage('bs-BA')
        .then(() => delay(5))
        .then(() => a.t('x')),
      b.changeLanguage('en-US').then(() => b.t('x')),
    ])

    expect(aValue).toBe('bosanski')
    expect(bValue).toBe('english')
    expect(a.language).toBe('bs-BA')
    expect(b.language).toBe('en-US')
    expect(i18n.language).toBe(globalLanguageBefore)
  })

  it('stay isolated across many interleaved requests', async () => {
    const globalLanguageBefore = i18n.language
    const locales = ['bs-BA', 'en-US']
    const expected: Record<string, string> = {
      'bs-BA': 'bosanski',
      'en-US': 'english',
    }

    const renders = Array.from({ length: 32 }, async (_, i) => {
      const locale = locales[i % 2]
      const clone = i18n.cloneInstance({ initAsync: false })
      await clone.changeLanguage(locale)
      await delay((i * 7) % 11)
      return { locale, language: clone.language, value: clone.t('x') }
    })

    for (const render of await Promise.all(renders)) {
      expect(render.language).toBe(render.locale)
      expect(render.value).toBe(expected[render.locale])
    }
    expect(i18n.language).toBe(globalLanguageBefore)
  })

  it('share the resource store with the singleton', () => {
    const clone = i18n.cloneInstance({ initAsync: false })
    i18n.addResourceBundle('en-US', 'common', { lateKey: 'added later' }, true, true)
    expect(clone.getFixedT('en-US', 'common')('lateKey')).toBe('added later')
  })
})

describe('global instance', () => {
  it('getFixedT works without any changeLanguage call', () => {
    const globalLanguageBefore = i18n.language
    expect(i18n.getFixedT('en-US', 'common')('x')).toBe('english')
    expect(i18n.getFixedT('bs-BA', 'common')('x')).toBe('bosanski')
    expect(i18n.language).toBe(globalLanguageBefore)
  })
})

describe('loadTranslationsForSSR', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    setAssets(undefined)
  })

  it('fills the shared store without switching the global language', async () => {
    const globalLanguageBefore = i18n.language
    const target = globalLanguageBefore === 'hr-HR' ? 'en-US' : 'hr-HR'

    await loadTranslationsForSSR(target)

    expect(i18n.language).toBe(globalLanguageBefore)
    expect(i18n.hasResourceBundle(target, 'common')).toBe(true)
  })

  it('makes a concurrent caller wait until every namespace is loaded (production path)', async () => {
    vi.stubEnv('DEV', false)
    const locale = 'xx-RACE'
    const globalLanguageBefore = i18n.language

    // `common` arrives at once, every other namespace later: a second request
    // arriving in between must not see "common is loaded" and render the
    // missing namespaces as raw keys.
    const fakeAssets = {
      fetch: async (request: Request) => {
        const ns = new URL(request.url).pathname.split('/').pop()!.replace('.json', '')
        if (ns !== 'common') await delay(30)
        return new Response(JSON.stringify({ ns }), {
          headers: { 'content-type': 'application/json' },
        })
      },
    }
    setAssets(fakeAssets as unknown as Parameters<typeof setAssets>[0])

    const first = loadTranslationsForSSR(locale)
    await delay(5)
    expect(i18n.hasResourceBundle(locale, 'common')).toBe(true)

    await loadTranslationsForSSR(locale)
    for (const ns of I18N_NAMESPACES) {
      expect(i18n.hasResourceBundle(locale, ns)).toBe(true)
    }
    await first
    expect(i18n.language).toBe(globalLanguageBefore)
  })
})
