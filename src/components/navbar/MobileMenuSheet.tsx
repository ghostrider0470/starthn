import { Link } from '@tanstack/react-router'
import {
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Phone,
  Settings,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RefObject } from 'react'
import type { NavDropdownEntry, NavLinkEntry } from './nav-entries'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  CallLink,
  useCallLabels,
  useOwnLocaleText,
} from '@/components/ContactActions'
import { useAuth } from '@/contexts/AuthContext'
import { designSystem } from '@/lib/design-system'
import { img } from '@/lib/image'
import { withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

const companyName = 'Start HN'

/**
 * The mobile menu sheet. A separate chunk, loaded by the Navbar when its menu
 * button is first pressed (or hovered/focused), so Radix Dialog, Accordion
 * and the theme menu are not in the entry chunk every page downloads.
 */
export function MobileMenuSheet({
  open,
  onOpenChange,
  triggerRef,
  locale: currentLocale,
  quickLinks: mobileQuickLinks,
  accordionGroups: mobileAccordionGroups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: RefObject<HTMLButtonElement | null>
  locale: string
  quickLinks: ReadonlyArray<NavLinkEntry>
  accordionGroups: ReadonlyArray<NavDropdownEntry>
}) {
  const { isAuthenticated, user, logout, canAccessAdmin } = useAuth()
  const { t } = useTranslation()
  const ownText = useOwnLocaleText('common')
  const callLabels = useCallLabels()
  const hoursLabel = ownText('contactActions.hoursLabel', '')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        // No SheetTrigger (the button lives in the Navbar's entry chunk), so
        // focus is handed back to it here when the sheet closes.
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          triggerRef.current?.focus()
        }}
        // Opaque: page text must not show through the menu items.
        className="inset-y-auto top-16 h-[calc(100dvh-4rem)] w-screen max-w-none border-l-0 bg-background p-0 [&>button]:hidden sm:max-w-none"
      >
        <SheetHeader className="border-b px-5 pb-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <img
                src="/logo-64.webp"
                alt=""
                className="h-8 w-8 object-contain"
                width={32}
                height={32}
                decoding="async"
              />
              <SheetTitle className="flex flex-col px-0 pt-0 text-left">
                <span
                  className={cn(
                    designSystem.typography.body.large,
                    'font-semibold leading-tight tracking-tight',
                  )}
                >
                  {companyName}
                </span>
                <span
                  className={cn(
                    designSystem.typography.body.small,
                    'font-normal uppercase tracking-wider text-muted-foreground',
                  )}
                >
                  {t('common.menu')}
                </span>
              </SheetTitle>
            </div>
            {isAuthenticated && (
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={img(user?.avatarUrl, {
                    width: 96,
                    format: 'auto',
                  })}
                />
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
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 pb-2">
            {mobileQuickLinks.length > 0 && (
              <div className="grid gap-2.5">
                {mobileQuickLinks.map((link) => (
                  <Link
                    key={link.id}
                    to={withLocalePath(link.href, currentLocale)}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      'rounded-xl border border-border bg-card px-4 py-3.5 font-medium',
                      'hover:border-primary/40 hover:bg-primary/10',
                    )}
                  >
                    {link.title}
                  </Link>
                ))}
              </div>
            )}

            <div className="rounded-xl border bg-card px-4">
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
                            to={withLocalePath(item.href, currentLocale)}
                            onClick={() => onOpenChange(false)}
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
                    onClick={() => onOpenChange(false)}
                    className="rounded-lg px-3 py-2.5 text-sm hover:bg-primary/10 hover:text-primary"
                  >
                    <span className="inline-flex items-center">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {t('nav.dashboard')}
                    </span>
                  </Link>
                  <Link
                    to={withLocalePath('/my-page', currentLocale)}
                    onClick={() => onOpenChange(false)}
                    className="rounded-lg px-3 py-2.5 text-sm hover:bg-primary/10 hover:text-primary"
                  >
                    <span className="inline-flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      My Page
                    </span>
                  </Link>
                  <Link
                    to={withLocalePath('/profile', currentLocale)}
                    onClick={() => onOpenChange(false)}
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
                      onClick={() => onOpenChange(false)}
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
                      onOpenChange(false)
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

            {/* Phone and hours in the lower part of the sheet. */}
            <div
              data-testid="menu-contact"
              className="mt-auto grid gap-3 rounded-xl border bg-card p-4"
            >
              <CallLink
                placement="menu_sheet"
                className={cn(
                  'flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90',
                  designSystem.effects.focusRing,
                )}
              >
                <Phone aria-hidden className="h-4 w-4" />
                <span className="tabular-nums">{callLabels.callNumber}</span>
              </CallLink>
              <div className="flex items-start gap-3 text-sm">
                <Clock
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                />
                <p className="leading-6 text-foreground">
                  {hoursLabel && (
                    <span className="block font-semibold">{hoursLabel}</span>
                  )}
                  <span className="block">{t('footer.contactInfo.hours')}</span>
                  <span className="block text-muted-foreground">
                    {t('footer.contactInfo.holidays')}
                  </span>
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 border-t pt-3 text-sm text-muted-foreground">
                <span aria-hidden>
                  {t('a11y.toggleTheme', {
                    defaultValue: 'Toggle theme',
                  })}
                </span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
