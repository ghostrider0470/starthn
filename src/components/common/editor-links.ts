const SITE_HOSTS = new Set(['starthn.ba', 'www.starthn.ba'])

export interface EditorLinkAttributes {
  href: string
  target: string | null
  rel: string | null
}

/**
 * Attributes for a link inserted in the rich-text editor.
 *
 * Internal links (relative paths, anchors, mailto:/tel:, or absolute URLs on
 * starthn.ba) are plain followed links with no target or rel. Only absolute
 * links to other sites open in a new tab, with `noopener noreferrer` — never
 * TipTap's default `nofollow`, which the editor used to put on every link.
 */
export function getEditorLinkAttributes(rawHref: string): EditorLinkAttributes {
  const href = rawHref.trim()
  if (!/^https?:\/\//i.test(href)) return { href, target: null, rel: null }

  let host = ''
  try {
    host = new URL(href).hostname.toLowerCase()
  } catch {
    return { href, target: null, rel: null }
  }

  return SITE_HOSTS.has(host)
    ? { href, target: null, rel: null }
    : { href, target: '_blank', rel: 'noopener noreferrer' }
}
