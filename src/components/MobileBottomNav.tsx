import { useMemo } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Home,
  Mail,
  Phone,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import {
  getLocaleFromPath,
  stripLocalePrefix,
  withLocalePath,
} from '@/lib/i18n-utils'
import { featureFlags } from '@/lib/feature-flags'
import { useConsentBannerOpen } from '@/components/CookieConsent'
import { CallLink, useCallLabels } from '@/components/ContactActions'

type NavItem = {
  icon: ReactNode
  label: string
  href: string
  activePrefix?: string
}

const ITEM_CLASS =
  'relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-all duration-200'

export function MobileBottomNav() {
  const location = useLocation()
  const currentPath = location.pathname
  const currentLocale = getLocaleFromPath(currentPath)
  const normalizedCurrentPath = stripLocalePrefix(currentPath)
  const { t } = useTranslation()
  const callLabels = useCallLabels()
  // While the cookie bar is open it docks exactly here, so the nav steps
  // aside instead of stacking under it (it is back as soon as the visitor
  // decides). Always false during SSR and hydration.
  const consentBannerOpen = useConsentBannerOpen()

  const navItems = useMemo<Array<NavItem>>(
    () => [
      {
        icon: <Home className="h-6 w-6" />,
        label: t('mobileNav.home'),
        href: '/',
      },
      {
        icon: <BriefcaseBusiness className="h-6 w-6" />,
        label: t('nav.solutions'),
        href: '/services',
        activePrefix: '/services',
      },
      ...(featureFlags.caseStudies
        ? [
            {
              icon: <BarChart3 className="h-6 w-6" />,
              label: t('mobileNav.caseStudies'),
              href: '/case-studies',
              activePrefix: '/case-studies',
            },
          ]
        : []),
      {
        icon: <BookOpen className="h-6 w-6" />,
        label: t('mobileNav.blog'),
        href: '/blog',
        activePrefix: '/blog',
      },
      {
        icon: <Mail className="h-6 w-6" />,
        label: t('nav.contact'),
        href: '/contact',
        activePrefix: '/contact',
      },
    ],
    [t],
  )

  const isActive = (item: NavItem) => {
    const targetPrefix = item.activePrefix ?? item.href
    if (targetPrefix === '/') {
      return normalizedCurrentPath === '/'
    }
    return normalizedCurrentPath.startsWith(targetPrefix)
  }

  return (
    <nav
      aria-label={t('mobileNav.navigation')}
      hidden={consentBannerOpen || undefined}
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
    >
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-background shadow-[0_10px_35px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-0.5 px-1.5 py-2">
          {navItems.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                to={withLocalePath(item.href, currentLocale)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  ITEM_CLASS,
                  designSystem.effects.focusRing,
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'transition-transform duration-200',
                    active && 'scale-110',
                  )}
                >
                  {item.icon}
                </span>
                <span className="max-w-full truncate px-0.5 text-[11px] leading-none">
                  {item.label}
                </span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-primary to-accent"
                  />
                )}
              </Link>
            )
          })}
          {/* Tap-to-call: one tap from every page (GA4 tel_click only after
              analytics consent). */}
          <CallLink
            placement="bottom_nav"
            className={cn(
              ITEM_CLASS,
              designSystem.effects.focusRing,
              'text-foreground hover:bg-primary/10',
            )}
          >
            <span aria-hidden className="text-primary">
              <Phone className="h-6 w-6" />
            </span>
            <span className="max-w-full truncate px-0.5 text-[11px] leading-none">
              {callLabels.call}
              {/* Name: "Pozovi 061 221 368" (visible label first). */}
              <span className="sr-only"> {callLabels.phone}</span>
            </span>
          </CallLink>
        </div>
      </div>
    </nav>
  )
}
