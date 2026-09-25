import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import {
  DESKTOP_NAV_CLASS,
  DESKTOP_NAV_LINK_EXTRA_CLASS,
  DESKTOP_NAV_TRIGGER_EXTRA_CLASS,
} from './DesktopNavStatic'
import type { DesktopNavEntry } from './nav-entries'
import type { DesktopNavIntent } from './DesktopNavStatic'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { designSystem } from '@/lib/design-system'
import { withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

/**
 * The interactive desktop navigation (Radix NavigationMenu with dropdowns).
 * Loaded on demand by the Navbar in place of DesktopNavStatic; `intent`
 * carries a click or keyboard focus that reached the static version first.
 */
export function DesktopNavMenu({
  entries,
  locale,
  intent,
}: {
  entries: ReadonlyArray<DesktopNavEntry>
  locale: string
  intent?: DesktopNavIntent
}) {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const focusId = intent?.focusId
    if (!focusId) return
    // Only when focus was lost with the static markup (it is now on <body>),
    // never when the visitor has moved on to something else.
    const active = document.activeElement
    if (active && active !== document.body) return
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-nav-id="${focusId}"]`)
      ?.focus()
    // Mount only: the intent is a one-time hand-over.
  }, [])

  return (
    <NavigationMenu
      ref={rootRef}
      viewport={false}
      className={DESKTOP_NAV_CLASS}
      defaultValue={intent?.openId}
    >
      <NavigationMenuList>
        {entries.map((entry) => (
          <NavigationMenuItem key={entry.id} value={entry.id}>
            {entry.type === 'link' ? (
              <NavigationMenuLink asChild>
                <Link
                  to={withLocalePath(entry.href, locale)}
                  data-nav-id={entry.id}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    DESKTOP_NAV_LINK_EXTRA_CLASS,
                  )}
                >
                  {entry.title}
                </Link>
              </NavigationMenuLink>
            ) : (
              <>
                <NavigationMenuTrigger
                  data-nav-id={entry.id}
                  className={DESKTOP_NAV_TRIGGER_EXTRA_CLASS}
                >
                  {entry.title}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="shadow-xl">
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                    {entry.items.map((item) => (
                      <li key={item.href}>
                        {/* One interactive element per item: the router
                            link, carrying the menu-link behaviour (no link
                            wrapped around it). */}
                        <NavigationMenuLink asChild>
                          <Link
                            to={withLocalePath(item.href, locale)}
                            className={cn(
                              'group block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none',
                              'transition-all hover:bg-primary/10 focus:bg-primary/10',
                              'border border-transparent hover:border-primary/50 hover:shadow-md',
                            )}
                          >
                            <span
                              className={cn(
                                designSystem.typography.body.small,
                                'block font-medium leading-none group-hover:text-foreground',
                              )}
                            >
                              {item.title}
                            </span>
                            <span
                              className={cn(
                                designSystem.typography.body.small,
                                'line-clamp-2 block leading-snug text-muted-foreground group-hover:text-foreground/80',
                              )}
                            >
                              {item.description}
                            </span>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
