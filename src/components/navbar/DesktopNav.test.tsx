import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DesktopNavMenu } from './DesktopNavMenu'
import { DesktopNavStatic } from './DesktopNavStatic'
import type { ReactNode } from 'react'
import type { DesktopNavEntry } from './nav-entries'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const ENTRIES: Array<DesktopNavEntry> = [
  {
    type: 'dropdown',
    id: 'solutions',
    title: 'Usluge',
    items: [{ title: 'Knjigovodstvo', href: '/services/x', description: 'd' }],
  },
  { type: 'link', id: 'contact', title: 'Kontakt', href: '/contact' },
]

/** tag name + sorted class list of every element carrying `attr`. */
function shapes(html: string, attr: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return [...doc.querySelectorAll(`[${attr}]`)].map((el) => ({
    key: el.getAttribute(attr),
    tag: el.tagName,
    classes: [...el.classList].sort(),
  }))
}

describe('DesktopNavStatic vs DesktopNavMenu', () => {
  const staticHtml = renderToString(
    <DesktopNavStatic entries={ENTRIES} locale="bs-BA" onIntent={() => {}} />,
  )
  const radixHtml = renderToString(
    <DesktopNavMenu entries={ENTRIES} locale="bs-BA" />,
  )

  it('renders the same triggers and links, with the same classes', () => {
    expect(shapes(staticHtml, 'data-nav-id')).toEqual(
      shapes(radixHtml, 'data-nav-id'),
    )
  })

  it('renders the same list and item classes', () => {
    expect(
      shapes(staticHtml, 'data-slot').filter(
        (s) => s.key !== 'navigation-menu',
      ),
    ).toEqual(
      shapes(radixHtml, 'data-slot').filter((s) => s.key !== 'navigation-menu'),
    )
    const root = (html: string) =>
      shapes(html, 'data-slot').find((s) => s.key === 'navigation-menu')
        ?.classes
    expect(root(staticHtml)).toEqual(root(radixHtml))
  })
})

describe('entry chunk guard', () => {
  // These modules are in the entry chunk (every page). Radix menus, dialogs
  // and popovers (and floating-ui behind them) must only be reached through
  // dynamic import().
  const ENTRY_MODULES = [
    'src/components/Navbar.tsx',
    'src/components/navbar/DesktopNavStatic.tsx',
    'src/components/navbar/nav-entries.ts',
    'src/components/LanguageSwitcher.tsx',
    'src/components/theme-toggle-button.tsx',
    'src/env.ts',
  ]
  const HEAVY =
    /from ['"](@radix-ui\/[^'"]+|radix-ui|zod|@t3-oss\/[^'"]+|@\/components\/ui\/(navigation-menu|dropdown-menu|sheet|dialog|popover|accordion|avatar)|@\/components\/(theme-toggle|LanguageSwitcherPanel|UserDropdownMenu|navbar\/(DesktopNavMenu|MobileMenuSheet|NavbarUserMenu)))['"]/

  for (const file of ENTRY_MODULES) {
    it(`${file} has no static import of menu/dialog/popover code`, () => {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8')
      const staticImports = source
        .split('\n')
        .filter(
          (line) =>
            /^\s*(import|export)\b/.test(line) || /^\s*}\s*from\s/.test(line),
        )
      expect(staticImports.filter((line) => HEAVY.test(line))).toEqual([])
    })
  }
})
