import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'
import { getLocaleDir, getLocaleFromPath } from '@/lib/i18n-utils'

/**
 * Keeps <html lang> and dir in sync with the URL locale on the client.
 * Call once in __root.tsx.
 *
 * Titles, descriptions, canonical, hreflang, robots and structured data are
 * all server-rendered by the route head() functions (see src/lib/seo-meta.ts
 * and the {-$locale} layout); this hook no longer touches them.
 */
export function useI18nMeta() {
  const location = useLocation()
  const locale = getLocaleFromPath(location.pathname)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = getLocaleDir(locale)
  }, [locale])

  // HTML cached before this change may still carry the client-injected SEO
  // nodes (organization, breadcrumb and article JSON-LD, article meta).
  useEffect(() => {
    document.head
      .querySelectorAll(
        'script[data-seo-id], meta[data-seo-article-meta], meta[data-blog-article-tag]',
      )
      .forEach((node) => node.remove())
  }, [])
}
