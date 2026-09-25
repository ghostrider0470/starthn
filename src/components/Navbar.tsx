import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Menu, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DesktopNavIntent } from '@/components/navbar/DesktopNavStatic'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { DeferredThemeToggle } from '@/components/theme-toggle-button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { CallLink, useCallLabels } from '@/components/ContactActions'
import { DesktopNavStatic } from '@/components/navbar/DesktopNavStatic'
import { useNavEntries } from '@/components/navbar/nav-entries'
import { useDeferredModule } from '@/lib/deferred-module'
import { whenIdleOrInteraction } from '@/components/chat/when-idle'

/*
 * The header's interactive parts (desktop dropdown navigation, mobile menu
 * sheet, avatar menu, theme menu, language popover) are separate chunks,
 * loaded on demand. Their Radix and floating-ui code (~100 KB of minified JS)
 * used to sit in the entry chunk, competing with the CSS, fonts and hero
 * image on every first load. The server renders plain, identical-looking
 * buttons and links, so nothing shifts when the interactive versions arrive.
 */
const loadDesktopNav = () => import('@/components/navbar/DesktopNavMenu')
const loadMobileSheet = () => import('@/components/navbar/MobileMenuSheet')
const NavbarUserMenu = lazy(() =>
  import('@/components/navbar/NavbarUserMenu').then((m) => ({
    default: m.NavbarUserMenu,
  })),
)

/** Tailwind's `lg`, where the desktop navigation is visible. */
const DESKTOP_QUERY = '(min-width: 1024px)'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()
  const callLabels = useCallLabels()
  const currentLocale = getLocaleFromPath(location.pathname)
  const companyName = 'Start HN'
  const { desktopNavEntries, mobileQuickLinks, mobileAccordionGroups } =
    useNavEntries(t)

  const [desktopNav, loadDesktopNavModule] = useDeferredModule(loadDesktopNav)
  const [desktopIntent, setDesktopIntent] = useState<DesktopNavIntent>()
  // True once the desktop header should turn interactive (large screen and
  // idle); it also preloads the theme menu.
  const [desktopEnhance, setDesktopEnhance] = useState(false)
  const [mobileSheet, loadMobileSheetModule] =
    useDeferredModule(loadMobileSheet)

  const enhanceDesktop = useCallback(
    (intent: DesktopNavIntent) => {
      if (intent.openId || intent.focusId) setDesktopIntent(intent)
      setDesktopEnhance(true)
      void loadDesktopNavModule()
    },
    [loadDesktopNavModule],
  )

  // Large screens: make the desktop navigation interactive once the page has
  // loaded and is idle, or at the first interaction. Phones never load it
  // (it is display:none there).
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia(DESKTOP_QUERY)
    let cancelIdle = () => {}
    const check = () => {
      cancelIdle()
      if (query.matches) {
        cancelIdle = whenIdleOrInteraction(() => enhanceDesktop({}), {
          delayMs: 0,
        })
      }
    }
    check()
    query.addEventListener('change', check)
    return () => {
      cancelIdle()
      query.removeEventListener('change', check)
    }
  }, [enhanceDesktop])

  const DesktopNavMenu = desktopNav?.DesktopNavMenu
  const MobileMenuSheet = mobileSheet?.MobileMenuSheet
  const preloadMobileSheet = () => {
    void loadMobileSheetModule()
  }

  return (
    <nav
      aria-label={t('nav.navigation')}
      className={cn(
        'fixed top-0 left-0 right-0 z-[70] w-full border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70',
        'transition-all duration-300 shadow-sm shadow-black/5',
      )}
    >
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none z-0 opacity-60" />
      {/* Match global layout container */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand. On phones the brand shrinks (min-w-0) so the
              tagline wraps instead of running under the language switcher
              and the call icon, which never shrink. */}
          <div className="flex min-w-0 items-center gap-3 md:gap-6">
            <Link
              to={withLocalePath('/', currentLocale)}
              className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {/* The brand text names the link (visually hidden between lg
                  and xl, where only the logo shows), so the logo itself is
                  decorative and the name is not read twice. */}
              <img
                src="/logo-64.webp"
                alt=""
                className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11"
                width={44}
                height={44}
                decoding="async"
              />
              <span className="min-w-0 lg:shrink-0 lg:max-xl:sr-only">
                <span className="block text-sm font-semibold leading-tight tracking-tight xl:whitespace-nowrap xl:text-base">
                  {companyName}
                </span>
                <span
                  className={cn(
                    designSystem.typography.body.small,
                    // Up to two lines, hyphenated in the page language
                    // ("Buchhaltungs-agentur"); hidden on the narrowest phones.
                    'line-clamp-2 hyphens-auto break-words text-[10px] uppercase leading-[1.2] tracking-[0.06em] text-muted-foreground max-[359px]:hidden sm:hidden',
                  )}
                >
                  {t('nav.tagline', { defaultValue: 'Accounting agency' })}
                </span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            {DesktopNavMenu ? (
              <DesktopNavMenu
                entries={desktopNavEntries}
                locale={currentLocale}
                intent={desktopIntent}
              />
            ) : (
              <DesktopNavStatic
                entries={desktopNavEntries}
                locale={currentLocale}
                onIntent={enhanceDesktop}
              />
            )}
          </div>

          {/* Right side actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
            <Button
              asChild
              size="sm"
              className="hidden h-9 px-4 lg:inline-flex"
            >
              <Link to={withLocalePath('/contact', currentLocale)}>
                {t('nav.contact')}
              </Link>
            </Button>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <LanguageSwitcher />
              {/* Below lg the theme toggle moves into the menu sheet and
                  this slot becomes tap-to-call (GA4 tel_click only after
                  analytics consent). */}
              <div className="hidden lg:flex">
                <DeferredThemeToggle preload={desktopEnhance} />
              </div>
              <CallLink
                placement="header"
                aria-label={callLabels.callAria}
                className={cn(
                  'inline-flex size-11 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 lg:hidden',
                  designSystem.effects.focusRing,
                )}
              >
                <Phone aria-hidden className="h-5 w-5" />
              </CallLink>
            </div>
            {isAuthenticated ? (
              <Suspense fallback={null}>
                <NavbarUserMenu locale={currentLocale} />
              </Suspense>
            ) : null}

            {/* Mobile menu trigger. The sheet itself loads on first use. */}
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon"
              className="size-11 lg:hidden"
              aria-haspopup="dialog"
              aria-expanded={mobileMenuOpen}
              data-state={mobileMenuOpen ? 'open' : 'closed'}
              onPointerEnter={preloadMobileSheet}
              onFocus={preloadMobileSheet}
              onClick={() => {
                preloadMobileSheet()
                setMobileMenuOpen(true)
              }}
            >
              <Menu aria-hidden className="h-5 w-5" />
              <span className="sr-only">{t('nav.toggleMenu')}</span>
            </Button>
            {MobileMenuSheet && (
              <MobileMenuSheet
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
                triggerRef={menuButtonRef}
                locale={currentLocale}
                quickLinks={mobileQuickLinks}
                accordionGroups={mobileAccordionGroups}
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
