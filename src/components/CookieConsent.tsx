import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { KeyboardEvent } from 'react'
import type { ConsentValue } from '@/lib/consent'
import { Button } from '@/components/ui/button'
import {
  getConsent,
  onConsentChange,
  onCookieSettingsOpen,
  setConsent,
} from '@/lib/consent'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

/**
 * English fallbacks. Translators add common.consent.* to the non-priority
 * locales separately, and i18next loads only the current locale (no fallback
 * bundle on the client), so a missing key must never render as the raw key.
 */
const FALLBACK = {
  title: 'Cookies and privacy',
  text: 'With your consent, we use Google Analytics and Microsoft Clarity to understand how the site is used and to improve it. Without consent they are not loaded, and you can change your choice at any time.',
  accept: 'Accept',
  reject: 'Decline',
  privacyLink: 'Privacy policy',
} as const

// ─── "Is the banner open?" store ────────────────────────────────────────────
// On phones the banner docks where the bottom navigation sits, and the nav
// steps aside while it is open (see MobileBottomNav). Server and first client
// render: closed, so the SSR markup never depends on it.

let bannerOpen = false
const bannerListeners = new Set<() => void>()

function setBannerOpen(open: boolean): void {
  if (bannerOpen === open) return
  bannerOpen = open
  for (const listener of bannerListeners) listener()
}

function subscribeBanner(listener: () => void): () => void {
  bannerListeners.add(listener)
  return () => bannerListeners.delete(listener)
}

/** True while the cookie banner is on screen. Always false during SSR. */
export function useConsentBannerOpen(): boolean {
  return useSyncExternalStore(
    subscribeBanner,
    () => bannerOpen,
    () => false,
  )
}

/**
 * Analytics cookie banner (decision D4). Non-blocking and fixed to the bottom
 * of the viewport, so it never shifts page content. Shown when the visitor
 * has not decided yet, or when openCookieSettings() is called (footer
 * "Cookie settings" button). Renders nothing on the server and on the first
 * client render, so hydration always matches the SSR markup.
 *
 * Phones get a compact bar docked in place of the bottom navigation (short
 * copy, the two choices side by side at 44px); from `md` up it is a card in
 * the bottom-right corner, clear of the left-aligned hero CTAs, above the
 * chat launcher and the hero carousel controls. Both choices always have
 * equal weight.
 */
export function CookieConsent() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const locale = getLocaleFromPath(location.pathname)
  const titleId = useId()
  const textId = useId()

  const [open, setOpen] = useState(false)
  const [openedOnRequest, setOpenedOnRequest] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (getConsent() === null) setOpen(true)

    const offOpen = onCookieSettingsOpen(() => {
      const active = document.activeElement
      returnFocusRef.current = active instanceof HTMLElement ? active : null
      setOpenedOnRequest(true)
      setOpen(true)
    })
    // A decision made anywhere (this banner or another instance) closes it.
    const offChange = onConsentChange(() => setOpen(false))

    return () => {
      offOpen()
      offChange()
    }
  }, [])

  useEffect(() => {
    setBannerOpen(open)
    return () => setBannerOpen(false)
  }, [open])

  // Opened from "Cookie settings": move focus in so keyboard users land on it.
  useEffect(() => {
    if (open && openedOnRequest) dialogRef.current?.focus()
  }, [open, openedOnRequest])

  const close = () => {
    setOpen(false)
    if (openedOnRequest) {
      const target = returnFocusRef.current
      returnFocusRef.current = null
      if (target?.isConnected) target.focus({ preventScroll: true })
    }
    setOpenedOnRequest(false)
  }

  const decide = (value: ConsentValue) => {
    setConsent(value)
    close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Escape dismisses only a re-opened banner; a first-time visitor must choose.
    if (event.key === 'Escape' && getConsent() !== null) {
      event.stopPropagation()
      close()
    }
  }

  if (!open) return null

  const title = t('consent.title', { defaultValue: FALLBACK.title })
  const fullText = t('consent.text', { defaultValue: FALLBACK.text })
  // A locale without the short copy shows the full text on phones too.
  const compactText = t('consent.textCompact', { defaultValue: fullText })

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-labelledby={titleId}
      aria-describedby={textId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      data-testid="cookie-consent"
      className={[
        // Phones: a compact bar docked at the bottom edge, where the bottom
        // navigation sits (the nav hides while this is open).
        'fixed inset-x-0 bottom-0 z-[55] rounded-t-2xl border-t border-border bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-foreground shadow-[0_-8px_30px_rgba(15,23,42,0.16)] outline-none',
        'animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none focus-visible:ring-2 focus-visible:ring-ring print:hidden',
        // md+: a card in the bottom-right corner, 6rem up: above the chat
        // launcher (bottom-6, 3.5rem tall) and the hero carousel controls
        // (md:pb-10), so neither is covered while the visitor decides.
        'md:inset-x-auto md:right-6 md:bottom-24 md:w-full md:max-w-md md:rounded-2xl md:border md:p-5 md:shadow-[0_10px_35px_rgba(15,23,42,0.18)]',
      ].join(' ')}
    >
      {/* Phones show the title inline at the start of the copy (one line
          saved); it stays the dialog's accessible name either way. */}
      <p
        id={titleId}
        className="font-heading text-base font-semibold text-foreground max-md:sr-only"
      >
        {title}
      </p>
      <p
        id={textId}
        className="text-[13px] leading-snug text-muted-foreground md:mt-1.5 md:text-sm md:leading-relaxed"
      >
        <span aria-hidden className="font-semibold text-foreground md:hidden">
          {title}.{' '}
        </span>
        <span className="md:hidden">{compactText}</span>
        <span className="hidden md:inline">{fullText}</span>{' '}
        <Link
          to={withLocalePath('/privacy', locale)}
          hash="cookies"
          className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
        >
          {t('consent.privacyLink', { defaultValue: FALLBACK.privacyLink })}
        </Link>
      </p>
      {/* Equal weight for both choices: declining is as easy as accepting. */}
      <div className="mt-2.5 grid grid-cols-2 gap-2 md:mt-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={() => decide('denied')}
        >
          {t('consent.reject', { defaultValue: FALLBACK.reject })}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={() => decide('granted')}
        >
          {t('consent.accept', { defaultValue: FALLBACK.accept })}
        </Button>
      </div>
    </div>
  )
}
