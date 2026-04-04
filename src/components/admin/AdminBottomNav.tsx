import { Link, useLocation } from '@tanstack/react-router'
import { ArrowLeft, FileText, LayoutDashboard, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { useAuth } from '@/contexts/AuthContext'
import {
  getLocaleFromPath,
  stripLocalePrefix,
  withLocalePath,
} from '@/lib/i18n-utils'

type NavItem = {
  icon: ReactNode
  label: string
  href: string
  activePrefix?: string
  permission?: string
}

const navItems: Array<NavItem> = [
  {
    icon: <LayoutDashboard className="h-6 w-6" />,
    label: 'Dashboard',
    href: '/admin',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    label: 'Blog',
    href: '/admin/blog',
    activePrefix: '/admin/blog',
    permission: 'manage:blog:own',
  },
  {
    icon: <Users className="h-6 w-6" />,
    label: 'Users',
    href: '/admin/users',
    activePrefix: '/admin/users',
    permission: 'manage:users',
  },
  {
    icon: <ArrowLeft className="h-6 w-6" />,
    label: 'Site',
    href: '/',
  },
]

export function AdminBottomNav() {
  const location = useLocation()
  const { hasPermission } = useAuth()
  const currentPath = location.pathname
  const currentLocale = getLocaleFromPath(currentPath)
  const normalizedCurrentPath = stripLocalePrefix(currentPath)

  const visibleItems = navItems.filter(item => !item.permission || hasPermission(item.permission))

  const isActive = (item: NavItem) => {
    const targetPrefix = item.activePrefix ?? item.href
    if (targetPrefix === '/admin') {
      return (
        normalizedCurrentPath === '/admin' ||
        normalizedCurrentPath === '/admin/'
      )
    }
    if (targetPrefix === '/') {
      return false // "Site" link is never active in admin
    }
    return normalizedCurrentPath.startsWith(targetPrefix)
  }

  return (
    <nav
      aria-label="Admin navigation"
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-primary/20 bg-background/92 shadow-[0_10px_35px_rgba(15,23,42,0.18)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between px-2 py-2">
          {visibleItems.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                to={withLocalePath(item.href, currentLocale)}
                aria-label={item.label}
                className={cn(
                  'relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-all duration-200',
                  designSystem.effects.focusRing,
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <div
                  className={cn(
                    'transition-transform duration-200',
                    active && 'scale-110',
                  )}
                >
                  {item.icon}
                </div>
                <span className="max-w-[54px] truncate text-[10px] leading-none">
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
