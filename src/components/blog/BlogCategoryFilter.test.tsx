import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import { BlogCategoryFilter } from './BlogCategoryFilter'
import type { Category } from '@/services/category.service'

function blogBundle(locale: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), `public/locales/${locale}/blog.json`), 'utf8'),
  ) as Record<string, unknown>
}

function renderFilter(locale: string, count: number) {
  const i18n = createInstance()
  void i18n.init({
    lng: locale,
    fallbackLng: false,
    ns: ['blog'],
    defaultNS: 'blog',
    resources: { [locale]: { blog: blogBundle(locale) } },
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  const categories: Array<Category> = Array.from({ length: count }, (_, i) => ({
    id: `c${i}`,
    slug: `category-${i}`,
    lang: locale,
    label: `Category ${i}`,
    translations: {},
    parentId: null,
  }))
  return render(
    <I18nextProvider i18n={i18n}>
      <BlogCategoryFilter
        categories={categories}
        locale={locale}
        selectedCategory="All"
        onSelectCategory={() => {}}
      />
    </I18nextProvider>,
  )
}

describe('BlogCategoryFilter', () => {
  it('shows the overflow controls in the page language', () => {
    renderFilter('bs-BA', 25)

    const toggle = screen.getByRole('button', { name: /\+17 više/ })
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: /Prikaži manje/ })).toBeTruthy()
    expect(screen.getByPlaceholderText('Pretraži kategorije…')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Show less|more|filters\./)
  })

  it('interpolates the hidden-category count in English', () => {
    renderFilter('en-US', 10)
    expect(screen.getByRole('button', { name: /\+2 more/ })).toBeTruthy()
  })
})
