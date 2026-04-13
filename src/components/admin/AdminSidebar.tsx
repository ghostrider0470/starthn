import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  ArrowLeft,
  Briefcase,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  User,
  Users,
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { featureFlags } from '@/lib/feature-flags'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

// ---------------------------------------------------------------------------
// Nav data
// ---------------------------------------------------------------------------

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
}

interface NavSection {
  title: string
  items: Array<NavItem>
}

const sections: Array<NavSection> = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard }],
  },
  {
    title: 'Content',
    items: [
      { label: 'Blog Posts', href: '/admin/blog', icon: FileText, permission: 'manage:blog:own' },
      ...(featureFlags.caseStudies
        ? [{ label: 'Case Studies', href: '/admin/case-studies', icon: Briefcase, permission: 'manage:case-studies' }]
        : []),
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users, permission: 'manage:users' },
      { label: 'Roles', href: '/admin/roles', icon: Shield, permission: 'manage:roles' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the current pathname matches a nav item's href.
 * For /admin (exact root) we require an exact match to avoid marking every
 * admin sub-page as active on the Dashboard entry.
 */
function isActive(pathname: string, itemHref: string, locale: string): boolean {
  const localizedHref = withLocalePath(itemHref, locale as any)
  if (itemHref === '/admin') {
    return pathname === localizedHref || pathname === '/admin'
  }
  return pathname.startsWith(localizedHref) || pathname.startsWith(itemHref)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SidebarNavProps {
  pathname: string
  locale: string
  onNavigate?: () => void
}

function SidebarNav({ pathname, locale, onNavigate }: SidebarNavProps) {
  const { hasPermission } = useAuth()

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {visibleSections.map((section) => (
        <div key={section.title} className="mb-6">
          <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase select-none">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href, locale)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    to={withLocalePath(item.href, locale as any) as any}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-4 shrink-0 transition-colors',
                        active
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-accent-foreground',
                      )}
                    />
                    <span>{item.label}</span>
                    {active && (
                      <ChevronRight className="ml-auto size-3 text-primary opacity-70" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

interface SidebarHeaderProps {
  locale: string
}

function SidebarHeaderSection({ locale }: SidebarHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 border-b px-4 py-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/10">
        <Shield className="size-4 text-destructive" />
      </div>
      <div className="flex flex-col gap-0.5 leading-none">
        <span className="text-sm font-semibold tracking-tight">
          Admin Panel
        </span>
      </div>
      <Badge
        className="ml-auto shrink-0 border-destructive/30 bg-destructive/10 text-destructive"
        variant="outline"
      >
        Admin
      </Badge>
    </div>
  )
}

interface SidebarFooterProps {
  locale: string
  onNavigate?: () => void
}

function SidebarFooterSection({ locale, onNavigate }: SidebarFooterProps) {
  const { user, logout } = useAuth()

  const fullName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email

  const email = user.email

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="border-t px-3 py-3 space-y-2">
      {/* Profile */}
      <Link
        to={withLocalePath('/profile', locale as any) as any}
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <User className="size-4 shrink-0" />
        <span>Profile</span>
      </Link>

      {/* Back to site */}
      <Link
        to={withLocalePath('/', locale as any) as any}
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <ArrowLeft className="size-4 shrink-0" />
        <span>Back to Site</span>
      </Link>

      {/* User info + logout */}
      <div className="flex items-center gap-2.5 rounded-md border bg-muted/40 px-2.5 py-2">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={fullName}
            className="size-7 shrink-0 rounded-full object-cover"
            width={28}
            height={28}
          />
        ) : (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase select-none">
            {fullName.charAt(0)}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col leading-none">
          <span className="truncate text-xs font-medium text-foreground">
            {fullName}
          </span>
          {email && (
            <span className="truncate text-[10px] text-muted-foreground">
              {email}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Log out"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="size-3.5" />
          <span className="sr-only">Log out</span>
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Desktop sidebar
// ---------------------------------------------------------------------------

interface DesktopSidebarProps {
  pathname: string
  locale: string
}

function DesktopSidebar({ pathname, locale }: DesktopSidebarProps) {
  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:shrink-0 lg:border-r lg:bg-card lg:h-screen lg:sticky lg:top-0">
      <SidebarHeaderSection locale={locale} />
      <SidebarNav pathname={pathname} locale={locale} />
      <SidebarFooterSection locale={locale} />
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Mobile top bar + sheet
// ---------------------------------------------------------------------------

interface MobileNavProps {
  pathname: string
  locale: string
}

function MobileNav({ pathname, locale }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  return (
    <div className="flex lg:hidden items-center gap-3 border-b bg-card px-4 py-3 sticky top-0 z-40">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 shrink-0">
            <Menu className="size-5" />
            <span className="sr-only">Open navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col gap-0">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
            <SidebarHeaderSection locale={locale} />
          </SheetHeader>
          <SidebarNav pathname={pathname} locale={locale} onNavigate={close} />
          <SidebarFooterSection locale={locale} onNavigate={close} />
        </SheetContent>
      </Sheet>

      {/* Breadcrumb hint on mobile */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Shield className="size-4 shrink-0 text-destructive" />
        <span className="text-sm font-semibold truncate">Admin Panel</span>
        <Badge
          variant="outline"
          className="shrink-0 border-destructive/30 bg-destructive/10 text-destructive"
        >
          Admin
        </Badge>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export function AdminSidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const locale = getLocaleFromPath(pathname)

  return (
    <>
      {/* Desktop: fixed left sidebar */}
      <DesktopSidebar pathname={pathname} locale={locale} />

      {/* Mobile: sticky top bar with slide-out sheet */}
      <MobileNav pathname={pathname} locale={locale} />
    </>
  )
}
