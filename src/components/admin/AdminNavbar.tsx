import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Tag,
  Users,
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

const navItems: Array<NavItem> = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Blog', href: '/admin/blog', icon: FileText, permission: 'manage:blog:own' },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree, permission: 'manage:categories' },
  { label: 'Tags', href: '/admin/tags', icon: Tag, permission: 'manage:tags' },
  { label: 'Users', href: '/admin/users', icon: Users, permission: 'manage:users' },
  { label: 'Roles', href: '/admin/roles', icon: Shield, permission: 'manage:roles' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isActive(pathname: string, itemHref: string, locale: string): boolean {
  const localizedHref = withLocalePath(itemHref, locale as any)
  if (itemHref === '/admin') {
    return pathname === localizedHref || pathname === '/admin'
  }
  return pathname.startsWith(localizedHref) || pathname.startsWith(itemHref)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const pathname = location.pathname
  const locale = getLocaleFromPath(pathname)
  const { user, logout, hasPermission } = useAuth()

  const visibleItems = navItems.filter(item => !item.permission || hasPermission(item.permission))

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user?.email ?? '')

  return (
    <nav
      aria-label="Admin navigation"
      className={cn(
        'sticky top-0 z-[70] w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'transition-all duration-300 shadow-lg shadow-primary/20',
        'border-primary',
      )}
    >
      {/* Subtle gradient accent — matches main Navbar */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none z-0" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo + Admin badge + nav links */}
          <div className="flex items-center gap-4">
            <Link
              to={withLocalePath('/admin', locale)}
              className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md px-1"
            >
              <img
                src="/clean-square.png"
                alt="Horizon Tech"
                className="h-14 w-auto py-1"
                decoding="async"
              />
              <Badge
                variant="outline"
                className="hidden sm:inline-flex shrink-0 border-destructive/30 bg-destructive/10 text-destructive text-[10px]"
              >
                Admin
              </Badge>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-1">
              {visibleItems.map((item) => {
                const active = isActive(pathname, item.href, locale)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    to={withLocalePath(item.href, locale as any) as any}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            {/* Back to site */}
            <Link
              to={withLocalePath('/', locale as any) as any}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Site</span>
            </Link>

            <LanguageSwitcher />
            <ThemeToggle />

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden lg:inline-flex gap-2 hover:bg-accent"
                >
                  <Avatar className="h-7 w-7 bg-primary/10">
                    <div className="flex items-center justify-center w-full h-full text-sm font-medium">
                      {user?.firstName[0]}
                      {user?.lastName[0]}
                    </div>
                  </Avatar>
                  <span className="max-w-[100px] truncate">
                    {user?.firstName}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p
                      className={cn(
                        designSystem.typography.body.small,
                        'font-medium leading-none',
                      )}
                    >
                      {fullName}
                    </p>
                    <p
                      className={cn(
                        designSystem.typography.body.small,
                        'text-muted-foreground leading-none',
                      )}
                    >
                      {user?.email}
                    </p>
                    {user?.roles && user.roles.length > 0 && (
                      <p className="text-xs leading-none text-primary font-medium mt-1">
                        {user.roles.join(' \u00b7 ')}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to={withLocalePath('/admin', locale)}
                    className="cursor-pointer"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to={withLocalePath('/', locale)}
                    className="cursor-pointer"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Site
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open admin menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="inset-y-auto top-16 h-[calc(100dvh-4rem)] w-screen max-w-none border-l-0 bg-background p-0 [&>button]:hidden sm:max-w-none"
              >
                <SheetHeader className="border-b px-5 pb-4 pt-4">
                  <SheetTitle className="px-0 pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          Administration
                        </p>
                        <p className="text-base font-semibold leading-tight">
                          Admin Panel
                        </p>
                      </div>
                      <Avatar className="h-9 w-9 bg-primary/10">
                        <div className="flex items-center justify-center w-full h-full text-sm font-medium">
                          {user?.firstName?.[0]}
                          {user?.lastName?.[0]}
                        </div>
                      </Avatar>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
                  <div className="mx-auto grid w-full max-w-md gap-5 pb-2">
                    {/* Admin nav items */}
                    <div className="grid gap-2.5">
                      {visibleItems.map((item) => {
                        const active = isActive(pathname, item.href, locale)
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            to={withLocalePath(item.href, locale as any) as any}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-xl border px-4 py-3.5 font-medium transition-all',
                              active
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border bg-card/70 hover:border-primary/40 hover:bg-primary/10',
                            )}
                          >
                            <Icon className="size-5 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>

                    {/* Back to site + logout */}
                    <div className="rounded-xl border bg-card/60 p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        Account
                      </p>
                      <div className="grid gap-2">
                        <Link
                          to={withLocalePath('/', locale as any) as any}
                          onClick={() => setMobileMenuOpen(false)}
                          className="rounded-lg px-3 py-2.5 text-sm hover:bg-primary/10 hover:text-primary"
                        >
                          <span className="inline-flex items-center">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Site
                          </span>
                        </Link>
                        <button
                          className="mt-1 rounded-lg px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            logout()
                            setMobileMenuOpen(false)
                          }}
                        >
                          <span className="inline-flex items-center">
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
