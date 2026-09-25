import { useEffect, useId, useRef, useState } from 'react'
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

/**
 * Analytics cookie banner (decision D4). Non-blocking and fixed to the bottom
 * of the viewport, so it never shifts page content. Shown when the visitor
 * has not decided yet, or when openCookieSettings() is called (footer
 * "Cookie settings" button). Renders nothing on the server and on the first
 * client render, so hydration always matches the SSR markup.
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
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[55] mx-auto max-w-lg rounded-2xl border border-border bg-background/95 p-4 text-foreground shadow-[0_10px_35px_rgba(15,23,42,0.18)] outline-none backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none supports-[backdrop-filter]:bg-background/85 focus-visible:ring-2 focus-visible:ring-ring print:hidden md:inset-x-auto md:bottom-6 md:left-6 md:mx-0 md:max-w-md md:p-5"
    >
      <p
        id={titleId}
        className="font-heading text-base font-semibold text-foreground"
      >
        {t('consent.title', { defaultValue: FALLBACK.title })}
      </p>
      <p
        id={textId}
        className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
      >
        {t('consent.text', { defaultValue: FALLBACK.text })}{' '}
        <Link
          to={withLocalePath('/privacy', locale)}
          hash="cookies"
          className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
        >
          {t('consent.privacyLink', { defaultValue: FALLBACK.privacyLink })}
        </Link>
      </p>
      {/* Equal weight for both choices: declining is as easy as accepting. */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => decide('denied')}
        >
          {t('consent.reject', { defaultValue: FALLBACK.reject })}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => decide('granted')}
        >
          {t('consent.accept', { defaultValue: FALLBACK.accept })}
        </Button>
      </div>
    </div>
  )
}
