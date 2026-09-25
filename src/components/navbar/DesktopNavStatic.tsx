import { Link } from '@tanstack/react-router'
import { ChevronDownIcon } from 'lucide-react'
import type { FocusEvent } from 'react'
import type { DesktopNavEntry } from './nav-entries'
import {
  navigationMenuLinkClass,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu-style'
import { withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

/*
 * Classes shared with the interactive version (DesktopNavMenu), so the swap
 * from this static markup to Radix NavigationMenu is invisible. The first
 * part of each mirrors src/components/ui/navigation-menu.tsx.
 */
export const DESKTOP_NAV_CLASS = 'hidden lg:flex'
export const DESKTOP_NAV_ROOT_CLASS = cn(
  'group/navigation-menu relative flex max-w-max flex-1 items-center justify-center',
  DESKTOP_NAV_CLASS,
)
export const DESKTOP_NAV_LIST_CLASS =
  'group flex flex-1 list-none items-center justify-center gap-1'
export const DESKTOP_NAV_TRIGGER_EXTRA_CLASS =
  'transition-colors data-[state=open]:bg-accent/60 data-[state=open]:text-accent-foreground'
export const DESKTOP_NAV_TRIGGER_CLASS = cn(
  navigationMenuTriggerStyle(),
  'group',
  DESKTOP_NAV_TRIGGER_EXTRA_CLASS,
)
export const DESKTOP_NAV_LINK_EXTRA_CLASS =
  'data-[active]:text-primary data-[active]:bg-accent/50'
/**
 * A top-level link as the Radix version renders it: NavigationMenuLink's own
 * classes, then (Radix Slot joins them, it does not merge) the Link's.
 */
export const DESKTOP_NAV_LINK_CLASS = `${navigationMenuLinkClass} ${cn(
  navigationMenuTriggerStyle(),
  DESKTOP_NAV_LINK_EXTRA_CLASS,
)}`
export const DESKTOP_NAV_CHEVRON_CLASS =
  'relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180'

/** What the visitor did before the interactive menu loaded. */
export type DesktopNavIntent = {
  /** Dropdown to open once loaded (it was clicked). */
  openId?: string
  /** Trigger or link to focus once loaded (it had keyboard focus). */
  focusId?: string
}

/**
 * Server-rendered desktop navigation: the same links and dropdown buttons as
 * the Radix NavigationMenu, without its JavaScript. The Navbar swaps in the
 * interactive DesktopNavMenu (a separate chunk) on large screens when the
 * browser is idle, or as soon as the pointer or keyboard reaches it; phones
 * (where this is display:none) never download it.
 */
export function DesktopNavStatic({
  entries,
  locale,
  onIntent,
}: {
  entries: ReadonlyArray<DesktopNavEntry>
  locale: string
  onIntent: (intent: DesktopNavIntent) => void
}) {
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const id = (event.target as HTMLElement).dataset.navId
    onIntent(id ? { focusId: id } : {})
  }

  return (
    <div
      data-slot="navigation-menu"
      data-viewport="false"
      className={DESKTOP_NAV_ROOT_CLASS}
      onPointerEnter={() => onIntent({})}
      onFocus={onFocus}
    >
      <div className="relative">
        <ul data-slot="navigation-menu-list" className={DESKTOP_NAV_LIST_CLASS}>
          {entries.map((entry) => (
            <li
              key={entry.id}
              data-slot="navigation-menu-item"
              className="relative"
            >
              {entry.type === 'link' ? (
                <Link
                  to={withLocalePath(entry.href, locale)}
                  data-slot="navigation-menu-link"
                  data-nav-id={entry.id}
                  className={DESKTOP_NAV_LINK_CLASS}
                >
                  {entry.title}
                </Link>
              ) : (
                <button
                  type="button"
                  data-slot="navigation-menu-trigger"
                  data-state="closed"
                  data-nav-id={entry.id}
                  aria-expanded={false}
                  className={DESKTOP_NAV_TRIGGER_CLASS}
                  onClick={() =>
                    onIntent({ openId: entry.id, focusId: entry.id })
                  }
                >
                  {entry.title}{' '}
                  <ChevronDownIcon
                    className={DESKTOP_NAV_CHEVRON_CLASS}
                    aria-hidden="true"
                  />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
