import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import type { TelClickPlacement } from '@/lib/analytics'
import { analytics } from '@/lib/analytics'
import {
  GOOGLE_BUSINESS_PROFILE_URL,
  GOOGLE_RATING,
  GOOGLE_REVIEW_COUNT,
  ID_BROJ,
  LEGAL_NAME,
  LOCALITY,
  MBS,
  PHONE_DISPLAY,
  PHONE_INTL,
  PHONE_TEL,
  POSTAL_CODE,
  STREET,
  formatRating,
} from '@/lib/business'
import { DEFAULT_LOCALE } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

/**
 * Locales whose visitors dial within BiH, so the local "061 221 368" format
 * reads naturally. Everyone else gets the international number.
 */
const LOCAL_PHONE_LOCALES: ReadonlySet<string> = new Set([
  'bs-BA',
  'hr-HR',
  'sr-Latn',
])

export function phoneForLocale(locale: string): string {
  return LOCAL_PHONE_LOCALES.has(locale) ? PHONE_DISPLAY : PHONE_INTL
}

type TextOptions = Record<string, unknown>

/**
 * t() for keys that some locales do not have yet. A key is used only when
 * the page's own locale has it — never a fallback language, which only the
 * SSR store may hold — so server and client render the same markup. Without
 * it the caller's locale-neutral fallback is used; a raw key never renders.
 */
export function useOwnLocaleText(ns = 'common') {
  const translation = useTranslation(ns)
  const { t } = translation
  // A mocked useTranslation (unit tests) may return only `t`.
  const i18n = (translation as { i18n?: typeof translation.i18n }).i18n
  return useCallback(
    (key: string, fallback: string, options?: TextOptions): string => {
      if (!i18n) return String(t(key, { ...options, defaultValue: fallback }))
      return i18n.exists(key, { ns, fallbackLng: false, ...options })
        ? String(t(key, options))
        : fallback
    },
    [t, i18n, ns],
  )
}

/** The current page locale as i18next sees it (per-request on the server). */
export function useLocale(): string {
  const translation = useTranslation()
  const i18n = (translation as { i18n?: typeof translation.i18n }).i18n
  return i18n?.language ?? DEFAULT_LOCALE
}

type CallLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  /** Which tel: link this is, for the consent-gated GA4 tel_click event. */
  placement: TelClickPlacement
  children: ReactNode
}

/**
 * A tel: link to the office. The GA4 `tel_click` event only fires for a
 * visitor who accepted analytics (analytics.telClick checks consent).
 */
export function CallLink({
  placement,
  onClick,
  children,
  ...props
}: CallLinkProps) {
  return (
    <a
      {...props}
      href={`tel:${PHONE_TEL}`}
      onClick={(event) => {
        onClick?.(event)
        void analytics.telClick(placement)
      }}
    >
      {children}
    </a>
  )
}

/**
 * Call labels in the page locale. A locale without the strings yet gets
 * locale-neutral text ("Tel.", the number) instead of a raw key.
 */
export function useCallLabels() {
  const text = useOwnLocaleText('common')
  const phone = phoneForLocale(useLocale())
  return {
    phone,
    /** Short visible label ("Pozovi"), e.g. for the bottom nav. */
    call: text('contactActions.call', 'Tel.'),
    /** Button label with the number. */
    callNumber: text('contactActions.callNumber', phone, { phone }),
    /** Accessible name for an icon-only call button. */
    callAria: text('contactActions.callAria', phone, { phone }),
  }
}

/**
 * "5,0 ★ na Googleu (19 recenzija)", linking to the Google Business Profile.
 * Visible text only (no AggregateRating markup). The star glyph is hidden
 * from screen readers, so the link reads "5,0 na Googleu (19 recenzija)".
 */
export function GoogleRatingLink({
  className,
  starClassName,
  tone = 'default',
}: {
  className?: string
  starClassName?: string
  tone?: 'default' | 'onDark'
}) {
  const text = useOwnLocaleText('common')
  const rating = formatRating(GOOGLE_RATING, useLocale())
  const count = GOOGLE_REVIEW_COUNT
  const line = text('trust.ratingLine', `${rating} ★ Google (${count})`, {
    rating,
    count,
  })
  const [before, ...rest] = line.split('★')
  const after = rest.join('★')

  return (
    <a
      href={GOOGLE_BUSINESS_PROFILE_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="google-rating"
      className={cn(
        'inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline',
        tone === 'onDark' ? 'text-white' : 'text-foreground',
        className,
      )}
    >
      {before.trimEnd()}
      {rest.length > 0 && (
        <>
          <span
            aria-hidden
            className={cn(
              tone === 'onDark'
                ? 'text-amber-300'
                : 'text-amber-700 dark:text-amber-400',
              starClassName,
            )}
          >
            ★
          </span>
          {after.trimStart()}
        </>
      )}
    </a>
  )
}

/**
 * "Računovodstvena agencija START HN d.o.o. · JIB … · MBS … · Ured: …".
 * The registered legal entity, so the office address can be reconciled with
 * the company registers.
 */
export function useLegalEntityLine(): string {
  const text = useOwnLocaleText('common')
  const address = `${STREET}, ${POSTAL_CODE} ${LOCALITY}`
  return text(
    'legalEntity.line',
    `${LEGAL_NAME} · JIB ${ID_BROJ} · MBS ${MBS} · ${address}`,
    { legalName: LEGAL_NAME, jib: ID_BROJ, mbs: MBS, address },
  )
}
