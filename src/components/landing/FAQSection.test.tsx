import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInstance } from 'i18next'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import { FAQSection } from './FAQSection'
import { JobListingsSection } from './JobListingsSection'
import type { ReactNode } from 'react'

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), `public/locales/${locale}/${ns}.json`), 'utf8'),
  ) as Record<string, unknown>
}

function createBsI18n() {
  const i18n = createInstance()
  void i18n.init({
    lng: 'bs-BA',
    fallbackLng: false,
    ns: ['landing', 'pages', 'common'],
    defaultNS: 'common',
    resources: {
      'bs-BA': {
        landing: readBundle('bs-BA', 'landing'),
        pages: readBundle('bs-BA', 'pages'),
        common: readBundle('bs-BA', 'common'),
      },
    },
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  return i18n
}

/** SSR HTML without <script> blocks, i.e. what a crawler sees before hydration. */
function ssrHtml(node: ReactNode): string {
  const i18n = createBsI18n()
  return renderToString(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>).replace(
    /<script\b[\s\S]*?<\/script>/gi,
    '',
  )
}

/** Plain text of an answer with the **bold** markers the component strips. */
function plain(text: string): string {
  return text.replace(/\*\*/g, '')
}

describe('FAQSection SSR', () => {
  const landing = readBundle('bs-BA', 'landing') as {
    faq: { items: Record<string, { question: string; answer: string }> }
  }
  const items = Object.values(landing.faq.items)

  it('server-renders every answer, including closed panels', () => {
    const html = ssrHtml(<FAQSection />)
    const text = html
      .replace(/<[^>]+>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')

    expect(html).toContain('Početak saradnje je jednostavan')
    for (const item of items) {
      expect(text).toContain(plain(item.answer))
    }
  })

  it('keeps closed panels hidden with CSS instead of the hidden attribute', () => {
    const html = ssrHtml(<FAQSection />)
    const panels = html.match(/<div[^>]*data-slot="accordion-content"[^>]*>/g) ?? []

    expect(panels).toHaveLength(items.length)
    for (const panel of panels) {
      expect(panel).toContain('data-state="closed"')
      expect(panel).toContain('data-[state=closed]:hidden')
      expect(panel).not.toMatch(/\shidden(=|\s|>)/)
    }
  })
})

describe('JobListingsSection SSR', () => {
  const pages = readBundle('bs-BA', 'pages') as {
    careers: {
      jobs: {
        listings: Array<{
          title: string
          summary: string
          responsibilities: Array<string>
        }>
      }
    }
  }
  const jobs = pages.careers.jobs.listings

  it('server-renders job details and keeps only the title in each heading', () => {
    const html = ssrHtml(<JobListingsSection />)

    expect(html).toContain(jobs[0].responsibilities[0])

    const headings = html.match(/<h3\b[\s\S]*?<\/h3>/g) ?? []
    expect(headings).toHaveLength(jobs.length)
    headings.forEach((heading, index) => {
      const text = heading.replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '').trim()
      expect(text).toBe(jobs[index].title)
      expect(heading).not.toContain(jobs[index].summary)
    })
  })

  it('keeps the whole card header clickable (trigger stretched over the row)', () => {
    const html = ssrHtml(<JobListingsSection />)
    const triggers =
      html.match(/<button[^>]*data-slot="accordion-trigger"[^>]*>/g) ?? []

    expect(triggers).toHaveLength(jobs.length)
    for (const trigger of triggers) {
      expect(trigger).toContain('after:absolute')
      expect(trigger).toContain('after:inset-0')
    }
    const rows = html.match(/<div class="relative flex items-start gap-4 px-6 py-5">/g) ?? []
    expect(rows).toHaveLength(jobs.length)
  })

  it('uses the public contact email', () => {
    const html = ssrHtml(<JobListingsSection />)

    expect(html).toContain('mailto:klijenti@starthn.ba')
    expect(html).not.toMatch(/\binfo@/)
  })
})
