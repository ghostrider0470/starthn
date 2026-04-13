import { Link, useLocation } from '@tanstack/react-router'
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { img } from '@/lib/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { UserDropdownMenu } from '@/components/UserDropdownMenu'
import { featureFlags } from '@/lib/feature-flags'

type NavRouteItem = {
  title: string
  href: string
  description: string
}

type NavDropdownEntry = {
  type: 'dropdown'
  id: 'solutions' | 'resources' | 'company'
  title: string
  items: Array<NavRouteItem>
}

type NavLinkEntry = {
  type: 'link'
  id: 'case-studies' | 'solutions' | 'contact'
  title: string
  href: string
}

type DesktopNavEntry = NavDropdownEntry | NavLinkEntry

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { isAuthenticated, user, logout, canAccessAdmin } = useAuth()
  const { t } = useTranslation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const companyName = 'Start HN'

  const { desktopNavEntries, mobileQuickLinks, mobileAccordionGroups } =
    useMemo(() => {
      const solutionItems: Array<NavRouteItem> = [
        {
          title: t('nav.enterpriseSoftware.title'),
          href: '/services/enterprise-software-development',
          description: t('nav.enterpriseSoftware.description'),
        },
        {
          title: t('nav.aiMl.title'),
          href: '/services/ai-ml-business-intelligence',
          description: t('nav.aiMl.description'),
        },
        {
          title: t('nav.cloudArchitecture.title'),
          href: '/services/cloud-architecture',
          description: t('nav.cloudArchitecture.description'),
        },
        {
          title: t('nav.iot.title'),
          href: '/services/iot-edge-computing',
          description: t('nav.iot.description'),
        },
        {
          title: t('nav.devops.title'),
          href: '/services/devops-platform-engineering',
          description: t('nav.devops.description'),
        },
        {
          title: t('nav.digitalTransformation.title'),
          href: '/services/digital-transformation',
          description: t('nav.digitalTransformation.description'),
        },
      ]

      const resourcesItems: Array<NavRouteItem> = [
        {
          title: t('nav.blog.title'),
          href: '/blog',
          description: t('nav.blog.description'),
        },
        ...(featureFlags.technicalResources
          ? [
              {
                title: t('nav.education.title'),
                href: '/education',
                description: t('nav.education.description'),
              },
              {
                title: t('nav.support.title'),
                href: '/support',
                description: t('nav.support.description'),
              },
              {
                title: t('nav.innovationLabOverview.title'),
                href: '/innovation-lab',
                description: t('nav.innovationLabOverview.description'),
              },
            ]
          : []),
      ]

      const companyItems: Array<NavRouteItem> = [
        {
          title: t('nav.about.title'),
          href: '/about',
          description: t('nav.about.description'),
        },
        {
          title: t('nav.team.title'),
          href: '/team',
          description: t('nav.team.description'),
        },
        {
          title: t('nav.careers.title'),
          href: '/careers',
          description: t('nav.careers.description'),
        },
      ]

      const desktopEntries: Array<DesktopNavEntry> = [
        {
          type: 'dropdown',
          id: 'solutions',
          title: t('nav.solutions'),
          items: solutionItems,
        },
        ...(featureFlags.caseStudies
          ? [
              {
                type: 'link' as const,
                id: 'case-studies' as const,
                title: t('nav.caseStudies.title'),
                href: '/case-studies',
              },
            ]
          : []),
        {
          type: 'dropdown',
          id: 'resources',
          title: t('nav.resources'),
          items: resourcesItems,
        },
        {
          type: 'dropdown',
          id: 'company',
          title: t('nav.company'),
          items: companyItems,
        },
      ]

      const compactQuickLinks: Array<NavLinkEntry> = [
        {
          type: 'link',
          id: 'solutions',
          title: t('nav.solutions'),
          href: '/services/enterprise-software-development',
        },
        ...(featureFlags.caseStudies
          ? [
              {
                type: 'link' as const,
                id: 'case-studies' as const,
                title: t('nav.caseStudies.title'),
                href: '/case-studies',
              },
            ]
          : []),
        {
          type: 'link',
          id: 'contact',
          title: t('nav.contact'),
          href: '/contact',
        },
      ]

      const accordionGroups = desktopEntries.filter(
        (entry): entry is NavDropdownEntry => entry.type === 'dropdown',
      )

      return {
        desktopNavEntries: desktopEntries,
        mobileQuickLinks: compactQuickLinks,
        mobileAccordionGroups: accordionGroups,
      }
    }, [t])

  return (
    <nav
      aria-label={t('nav.navigation')}
      className={cn(
        'fixed top-0 left-0 right-0 z-[70] w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'transition-all duration-300 shadow-lg shadow-primary/20',
        'border-primary',
      )}
    >
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none z-0" />
      {/* Match global layout container */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 md:gap-6">
            <Link
              to={withLocalePath('/', currentLocale)}
              className="flex items-center gap-2.5 rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <img
                src="/logo-64.webp"
                alt={companyName}
                className="h-8 w-8 object-contain sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11"
                width={44}
                height={44}
                decoding="async"
              />
              <span className="lg:hidden">
                <span className="block text-sm font-semibold leading-tight tracking-tight">
                  {companyName}
                </span>
                <span
                  className={cn(
                    designSystem.typography.body.small,
                    'block text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:hidden',
                  )}
                >
                  {t('nav.company')}
                </span>
              </span>
              <span className="hidden shrink-0 xl:block">
                <span className="block whitespace-nowrap text-base font-semibold leading-tight tracking-tight">
                  {companyName}
                </span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <NavigationMenu viewport={false} className="hidden lg:flex">
              <NavigationMenuList>
                {desktopNavEntries.map((entry) => (
                  <NavigationMenuItem key={entry.id}>
                    {entry.type === 'link' ? (
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLocalePath(entry.href, currentLocale)}
                          className={cn(
                            navigationMenuTriggerStyle(),
                            'data-[active]:text-primary data-[active]:bg-accent/50',
                          )}
                        >
                          {entry.title}
                        </Link>
                      </NavigationMenuLink>
                    ) : (
                      <>
                        <NavigationMenuTrigger className="transition-colors data-[state=open]:bg-accent/60 data-[state=open]:text-accent-foreground">
                          {entry.title}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="shadow-xl">
                          <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                            {entry.items.map((item) => (
                              <li key={item.href}>
                                <Link
                                  to={withLocalePath(item.href, currentLocale)}
                                >
                                  <NavigationMenuLink asChild>
                                    <div
                                      className={cn(
                                        'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none group',
                                        'transition-all hover:bg-primary/10 focus:bg-primary/10',
                                        'hover:shadow-md border border-transparent hover:border-primary/50',
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          designSystem.typography.body.small,
                                          'font-medium leading-none group-hover:text-foreground',
                                        )}
                                      >
                                        {item.title}
                                      </div>
                                      <p
                                        className={cn(
                                          designSystem.typography.body.small,
                                          'line-clamp-2 leading-snug text-muted-foreground group-hover:text-foreground/80',
                                        )}
                                      >
                                        {item.description}
                                      </p>
                                    </div>
                                  </NavigationMenuLink>
                                </Link>
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
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            <Link
              to={withLocalePath('/contact', currentLocale)}
              className="hidden lg:inline-flex"
            >
              <Button size="sm" className="h-9 px-4">
                {t('nav.contact')}
              </Button>
            </Link>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            {isAuthenticated ? (
              <>
                {/* Desktop User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative hidden lg:inline-flex h-9 w-9 rounded-full p-0 hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background transition-all duration-300"
                      aria-label="Open user menu"
                    >
                      <Avatar className="h-9 w-9 border-2 border-transparent hover:border-primary transition-colors">
                        <AvatarImage src={img(user?.avatarUrl, { width: 96, format: 'auto' })} />
                        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                          {user?.firstName[0]}
                          {user?.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <UserDropdownMenu locale={currentLocale} showAdminLink />
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Login/Sign Up buttons hidden
                <Link to="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden md:inline-flex"
                  >
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="hidden md:inline-flex">
                    Sign Up
                  </Button>
                </Link>
              */}
              </>
            )}

            {/* Mobile menu trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t('nav.toggleMenu')}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="inset-y-auto top-16 h-[calc(100dvh-4rem)] w-screen max-w-none border-l-0 bg-gradient-to-b from-card/50 via-background to-background p-0 [&>button]:hidden sm:max-w-none"
              >
                <SheetHeader className="border-b px-5 pb-4 pt-4">
                  <SheetTitle className="px-0 pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-left">
                        <img
                          src="/logo-64.webp"
                          alt={companyName}
                          className="h-8 w-8 object-contain"
                          width={32}
                          height={32}
                          decoding="async"
                        />
                        <div>
                          <p
                            className={cn(
                              designSystem.typography.body.large,
                              'font-semibold leading-tight tracking-tight',
                            )}
                          >
                            {companyName}
                          </p>
                          <p
                            className={cn(
                              designSystem.typography.body.small,
                              'text-muted-foreground uppercase tracking-wider',
                            )}
                          >
                            {t('common.menu')}
                          </p>
                        </div>
                      </div>
                      {isAuthenticated && (
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={img(user?.avatarUrl, { width: 96, format: 'auto' })} />
                          <AvatarFallback
                            className={cn(
                              'bg-primary/10',
                              designSystem.typography.body.small,
                              'font-medium',
                            )}
                          >
                            {user?.firstName[0]}
                            {user?.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
                  <div className="mx-auto grid w-full max-w-md gap-5 pb-2">
                    <div className="grid gap-2.5">
                      {mobileQuickLinks.map((link) => (
                        <Link
                          key={link.id}
                          to={withLocalePath(link.href, currentLocale)}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'rounded-xl border border-border bg-card/70 px-4 py-3.5 font-medium',
                            'hover:border-primary/40 hover:bg-primary/10',
                          )}
                        >
                          {link.title}
                        </Link>
                      ))}
                    </div>

                    <div className="rounded-xl border bg-card/60 px-4">
                      <Accordion type="multiple" className="w-full">
                        {mobileAccordionGroups.map((group) => (
                          <AccordionItem key={group.id} value={group.id}>
                            <AccordionTrigger className="py-4 hover:no-underline">
                              <span className="text-sm font-semibold">
                                {group.title}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="grid gap-2 pb-3">
                                {group.items.map((item) => (
                                  <Link
                                    key={item.href}
                                    to={withLocalePath(
                                      item.href,
                                      currentLocale,
                                    )}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                      'rounded-lg px-3 py-2.5 text-sm',
                                      'hover:bg-primary/10 hover:text-primary',
                                    )}
                                  >
                                    {item.title}
                                  </Link>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>

                    {isAuthenticated && (
                      <div className="rounded-xl border bg-card/60 p-4">
                        <p
                          className={cn(
                            designSystem.typography.body.small,
                            'text-muted-foreground uppercase tracking-wider mb-2',
                          )}
                        >
                          {t('common.account')}
                        </p>
                        <div className="grid gap-2">
                          <Link
                            to={withLocalePath('/dashboard', currentLocale)}
                            onClick={() => setMobileMenuOpen(false)}
                            className="rounded-lg px-3 py-2.5 text-sm hover:bg-primary/10 hover:text-primary"
                          >
                            <span className="inline-flex items-center">
                              <LayoutDashboard className="mr-2 h-4 w-4" />
                              {t('nav.dashboard')}
                            </span>
                          </Link>
<Link
                            to={withLocalePath('/my-page', currentLocale)}
                            onClick={() => setMobileMenuOpen(false)}
                            className="rounded-lg px-3 py-2.5 text-sm hover:bg-primary/10 hover:text-primary"
                          >
                            <span className="inline-flex items-center">
                              <FileText className="mr-2 h-4 w-4" />
                              My Page
                            </span>
                          </Link>
                          <Link
                            to={withLocalePath('/profile', currentLocale)}
                            onClick={() => setMobileMenuOpen(false)}
                            className="rounded-lg px-3 py-2.5 text-sm hover:bg-primary/10 hover:text-primary"
                          >
                            <span className="inline-flex items-center">
                              <User className="mr-2 h-4 w-4" />
                              {t('nav.profile')}
                            </span>
                          </Link>
                          {canAccessAdmin && (
                            <Link
                              to={withLocalePath('/admin', currentLocale)}
                              onClick={() => setMobileMenuOpen(false)}
                              className="rounded-lg px-3 py-2.5 text-sm hover:bg-primary/10 hover:text-primary"
                            >
                              <span className="inline-flex items-center">
                                <Settings className="mr-2 h-4 w-4" />
                                {t('nav.adminPanel')}
                              </span>
                            </Link>
                          )}
                          <button
                            className="mt-1 rounded-lg px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              logout()
                              setMobileMenuOpen(false)
                            }}
                          >
                            <span className="inline-flex items-center">
                              <LogOut className="mr-2 h-4 w-4" />
                              {t('nav.logOut')}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
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
