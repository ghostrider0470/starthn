import { useEffect } from 'react'
import { Asset, useHydrated, useRouter, useTags } from '@tanstack/react-router'

type HeadTag = ReturnType<typeof useTags>[number]

/**
 * Marks the `<link>` that TanStack Start's dev server renders with a snapshot
 * of the route CSS (so the SSR page is styled before Vite's own style tags
 * load). Production builds never emit it.
 */
export const DEV_STYLES_ATTR = 'data-tanstack-router-dev-styles'

/**
 * `tag` with `fetchpriority="low"` if it is a <link rel="modulepreload">.
 *
 * TanStack Start preloads every JS chunk of the page in <head>. At the
 * default (High) priority they share the first round trips with the
 * render-blocking stylesheet, the fonts and the hero image, which delays the
 * first paint on slow mobile connections (Lighthouse also counts High-priority
 * scripts as render-blocking). At low priority they still start at once and
 * are reused by the module import at the end of <body>; only the order
 * changes: CSS, fonts and the LCP image first, then the JS that hydrates an
 * already painted page.
 */
export function withLowPriorityModulePreload(tag: HeadTag): HeadTag {
  if (tag.tag !== 'link' || tag.attrs?.rel !== 'modulepreload') return tag
  return { ...tag, attrs: { ...tag.attrs, fetchPriority: 'low' } }
}

/**
 * The head tags to render. Once hydrated, the dev-only CSS snapshot link is
 * dropped (as TanStack's development `HeadContent` does): Vite's HMR style
 * tags own the styles from then on, and a stale snapshot would keep
 * overriding edited rules until a full reload.
 */
export function selectHeadTags(
  tags: ReadonlyArray<HeadTag>,
  hydrated: boolean,
): Array<HeadTag> {
  const visible = hydrated
    ? tags.filter((tag) => !tag.attrs?.[DEV_STYLES_ATTR])
    : tags
  return visible.map(withLowPriorityModulePreload)
}

/**
 * TanStack's <HeadContent />, with modulepreloads at low priority. It keeps
 * the development build's cleanup of the dev-styles link; in production there
 * is no such tag, so the filter and the effect are no-ops.
 */
export function PrioritizedHeadContent() {
  const tags = useTags()
  const nonce = useRouter().options.ssr?.nonce
  const hydrated = useHydrated()

  // Fallback for hydration-mismatch cases where React keeps the server node.
  useEffect(() => {
    if (!hydrated) return
    document
      .querySelectorAll(`link[${DEV_STYLES_ATTR}]`)
      .forEach((el) => el.remove())
  }, [hydrated])

  return (
    <>
      {selectHeadTags(tags, hydrated).map((tag) => (
        <Asset {...tag} key={`tsr-meta-${JSON.stringify(tag)}`} nonce={nonce} />
      ))}
    </>
  )
}
