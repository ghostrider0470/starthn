import { useMemo } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { BarChart3, BookOpen, BriefcaseBusiness, Home, Mail, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, stripLocalePrefix, withLocalePath } from '@/lib/i18n-utils'
import { featureFlags } from '@/lib/feature-flags'

type NavItem = {
  icon: ReactNode
  label: string
  href: string
  activePrefix?: string
}

export function MobileBottomNav() {
  const location = useLocation()
  const currentPath = location.pathname
  const currentLocale = getLocaleFromPath(currentPath)
  const normalizedCurrentPath = stripLocalePrefix(currentPath)
  const { t } = useTranslation()

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
        href: '/services/cloud-architecture',
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
      ...(featureFlags.technicalResources
        ? [
            {
              icon: <Sparkles className="h-6 w-6" />,
              label: t('mobileNav.aiSystems'),
              href: '/innovation-lab/ai-systems',
              activePrefix: '/innovation-lab',
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
    [t]
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
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
    >
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-background/95 shadow-[0_10px_35px_rgba(15,23,42,0.18)] backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex items-center justify-between px-2 py-2">
          {navItems.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                to={withLocalePath(item.href, currentLocale)}
                aria-label={item.label}
                className={cn(
                  'relative flex min-h-12 w-1/5 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-all duration-200',
                  designSystem.effects.focusRing,
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn('transition-transform duration-200', active && 'scale-110')}>
                  {item.icon}
                </div>
                <span className="max-w-[54px] truncate text-[11px] leading-none">
                  {item.label}
                </span>
                {active && (
                  <div className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-primary to-accent" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
