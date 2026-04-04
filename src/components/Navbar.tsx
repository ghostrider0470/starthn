import { Link, useLocation } from '@tanstack/react-router'
import { Menu, Phone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { ThemeToggle } from '@/components/theme-toggle'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

type NavLink = {
  title: string
  href: string
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { t } = useTranslation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const companyName = 'Start HN'

  const navLinks: NavLink[] = [
    { title: t('nav.services'), href: '/usluge' },
    { title: t('nav.blog'), href: '/blog' },
    { title: t('nav.about'), href: '/about' },
    { title: t('nav.gallery'), href: '/galerija' },
    { title: t('nav.faq'), href: '/faq' },
  ]

  return (
    <nav
      aria-label={t('nav.navigation')}
      className={cn(
        'fixed top-0 left-0 right-0 z-[70] w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'transition-all duration-300 shadow-lg shadow-primary/20',
        'border-primary',
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none z-0" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 md:gap-6">
            <Link
              to={withLocalePath('/', currentLocale)}
              className="flex items-center gap-2.5 rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <img
                src="/clean-square.png"
                alt={companyName}
                className="h-8 w-8 object-contain sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11"
                decoding="async"
              />
              <span className="block">
                <span className="block text-sm font-semibold leading-tight tracking-tight sm:text-base">
                  {companyName}
                </span>
                <span
                  className={cn(
                    designSystem.typography.body.small,
                    'block text-[10px] uppercase tracking-[0.14em] text-muted-foreground',
                  )}
                >
                  Računovodstvena agencija
                </span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={withLocalePath(link.href, currentLocale)}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'hover:bg-accent/60 hover:text-accent-foreground',
                    'data-[active]:text-primary data-[active]:bg-accent/50',
                  )}
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            <Link
              to={withLocalePath('/contact', currentLocale)}
              className="hidden lg:inline-flex"
            >
              <Button size="sm" className="h-9 px-4">
                <Phone className="mr-2 h-4 w-4" />
                {t('nav.contact')}
              </Button>
            </Link>
            <ThemeToggle />

            {/* Mobile menu trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
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
                    <div className="flex items-center gap-3 text-left">
                      <img
                        src="/clean-square.png"
                        alt={companyName}
                        className="h-8 w-8 object-contain"
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
                            'text-muted-foreground',
                          )}
                        >
                          Računovodstvena agencija
                        </p>
                      </div>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
                  <div className="mx-auto grid w-full max-w-md gap-2.5">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
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
                    <Link
                      to={withLocalePath('/contact', currentLocale)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'rounded-xl border border-primary bg-primary/10 px-4 py-3.5 font-medium text-primary',
                        'hover:bg-primary/20',
                      )}
                    >
                      <Phone className="mr-2 inline h-4 w-4" />
                      {t('nav.contact')}
                    </Link>
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
