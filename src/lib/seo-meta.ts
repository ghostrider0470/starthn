/**
 * Localized per-page <head> strings (title, description, Open Graph and
 * Twitter) for route head() functions.
 *
 * head() runs on the server during SSR and again on the client during
 * hydration, so both runs must produce the same strings from the same data:
 * the client only has the page locale's bundles (the dehydrated i18n store).
 * Lookups are therefore exact — only the page locale's own store, never
 * i18next's global fallbackLng, which on the server could hit a bundle that
 * another request happened to load.
 *
 * Missing keys: during SSR, ensureSeoFallbackForSSR() fills the gaps in the
 * page locale's `seo` bundle from its fallback chain (bs-BA for Bosnian,
 * Croatian and Serbian; en-US for every other language; then bs-BA). The
 * filled bundle is what gets dehydrated, so server and client agree, and a
 * raw key is never rendered.
 */
import type { ServiceId } from '@/lib/service-routes'
import type { ServicePricePlan } from '@/lib/seo'
import i18n, { loadTranslationsForSSR } from '@/i18n'
import { BRAND } from '@/lib/business'
import { DEFAULT_LOCALE, isValidLocale } from '@/lib/i18n-utils'
import {
  SEO_PAGE_KEY,
  buildLocalBusinessStructuredData,
  buildServiceStructuredData,
  buildWebSiteStructuredData,
  jsonLd,
  localizedCanonicalUrl,
  parsePriceAmount,
} from '@/lib/seo'
import { SERVICE_ROUTES } from '@/lib/service-routes'

export { SEO_PAGE_KEY }

/** Last resort when no bundle is available at all (never a raw key). */
const LAST_RESORT_SEO = {
  title: BRAND,
  description:
    'Računovodstvena agencija Start HN, Ibrahima Ljubovića 47, 71210 Ilidža: knjigovodstvo, obračun plata, PDV i porezno savjetovanje.',
} as const

const BALKAN_LANGUAGES = new Set(['bs', 'hr', 'sr'])

export function toPageLocale(localeParam: string | undefined): string {
  return isValidLocale(localeParam) ? localeParam : DEFAULT_LOCALE
}

/** The language whose SEO strings stand in for a missing key. */
export function seoFallbackLocale(locale: string): string {
  return BALKAN_LANGUAGES.has(locale.split('-')[0].toLowerCase())
    ? 'bs-BA'
    : 'en-US'
}

/** [locale, its fallback, the default locale], without duplicates. */
export function seoFallbackChain(locale: string): Array<string> {
  return [...new Set([locale, seoFallbackLocale(locale), DEFAULT_LOCALE])]
}

/**
 * The translation of `key` in exactly `locale` (no fallback language), or
 * undefined when that locale's store has no non-empty string for it.
 */
export function translateExact(
  locale: string,
  ns: string,
  key: string,
): string | undefined {
  const raw: unknown = i18n.getResource(locale, ns, key)
  if (typeof raw !== 'string' || raw.trim() === '') return undefined
  return String(i18n.getFixedT(locale, ns)(key))
}

/**
 * Copies the SEO strings a locale is missing from its fallback chain into
 * its own `seo` bundle. Existing strings are never overwritten, and the
 * copied objects are cloned so the bundles never share nested objects.
 */
export function mergeSeoFallback(locale: string): void {
  for (const fallback of seoFallbackChain(locale).slice(1)) {
    const bundle: unknown = i18n.getResourceBundle(fallback, 'seo')
    if (bundle && typeof bundle === 'object') {
      i18n.addResourceBundle(locale, 'seo', structuredClone(bundle), true, false)
    }
  }
}

const seoFallbackMerged = new Set<string>()

/**
 * SSR only: loads the fallback locales and fills the page locale's missing
 * SEO strings (see the module comment). Call after loadTranslationsForSSR.
 */
export async function ensureSeoFallbackForSSR(locale: string): Promise<void> {
  if (typeof window !== 'undefined') return
  if (!import.meta.env.DEV && seoFallbackMerged.has(locale)) return
  const fallbacks = seoFallbackChain(locale).slice(1)
  if (fallbacks.length === 0) return
  for (const fallback of fallbacks) {
    await loadTranslationsForSSR(fallback)
  }
  mergeSeoFallback(locale)
  if (!import.meta.env.DEV) seoFallbackMerged.add(locale)
}

export interface SeoStrings {
  title: string
  description: string
}

/**
 * Title and description for a page (seo:pages.<pageKey>) or the site default
 * ('default' → seo:default). Looks in the page locale, then its fallback
 * chain, then the site default; never returns a raw key.
 */
export function resolveSeoStrings(
  pageKey: string,
  localeParam: string | undefined,
): SeoStrings {
  const locale = toPageLocale(localeParam)
  const prefix = pageKey === 'default' ? 'default' : `pages.${pageKey}`

  for (const lng of seoFallbackChain(locale)) {
    const title = translateExact(lng, 'seo', `${prefix}.title`)
    const description = translateExact(lng, 'seo', `${prefix}.description`)
    if (title && description) return { title, description }
  }

  return pageKey === 'default'
    ? { ...LAST_RESORT_SEO }
    : resolveSeoStrings('default', locale)
}

/**
 * head() for a static page: localized title, description, og:title,
 * og:description, twitter:title and twitter:description. The {-$locale}
 * layout adds canonical, hreflang, robots, og:url and og:locale.
 */
export function localizedPageHead(
  pageKey: string,
  localeParam: string | undefined,
  opts?: { robots?: string },
) {
  const { title, description } = resolveSeoStrings(pageKey, localeParam)
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      ...(opts?.robots ? [{ name: 'robots', content: opts.robots }] : []),
    ],
  }
}

/**
 * The business (AccountingService) and WebSite nodes for the page locale, for
 * the root head() on every page: url is the locale's home, the descriptions
 * are seo:default.description, the catalog name is common:breadcrumbs.
 * services. Only `seo` and `common` are read, which every page ships to the
 * client (BASE_RESOURCES), so the hydration re-run renders the same JSON.
 */
export function localizedSiteStructuredData(localeParam: string | undefined) {
  const locale = toPageLocale(localeParam)
  const { description } = resolveSeoStrings('default', locale)
  const catalogName =
    translateExact(locale, 'common', 'breadcrumbs.services') ?? null
  return [
    buildLocalBusinessStructuredData(locale, { description, catalogName }),
    buildWebSiteStructuredData(locale, description),
  ]
}

/**
 * The price plans a service page shows in `locale`
 * (services:items.<serviceId>.pricing.plans), as Offer input. A plan whose
 * name or KM price cannot be read is skipped, so markup only ever repeats a
 * visible price. Empty for services without a price block.
 */
export function servicePricePlans(
  serviceId: ServiceId,
  locale: string,
): Array<ServicePricePlan> {
  const plans: unknown = i18n.getResource(
    locale,
    'services',
    `items.${serviceId}.pricing.plans`,
  )
  if (!Array.isArray(plans)) return []
  const text = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value.trim() : null
  return plans.flatMap((plan: unknown): Array<ServicePricePlan> => {
    if (!plan || typeof plan !== 'object') return []
    const { name, price, period, note } = plan as Record<string, unknown>
    const planName = text(name)
    const priceLabel = text(price)
    const minPrice = priceLabel ? parsePriceAmount(priceLabel) : null
    if (!planName || minPrice === null) return []
    return [
      {
        name: planName,
        minPrice,
        unitText: text(period),
        description: text(note),
      },
    ]
  })
}

/**
 * head() for a service page: the localized page head (seo:pages.<pageKey>)
 * plus Service JSON-LD whose name and description come from
 * services:items.<serviceId>, serviceType from common:breadcrumbs.<pageKey>
 * and Offers from the page's visible price block, if it has one.
 */
export function localizedServiceHead(
  serviceId: ServiceId,
  localeParam: string | undefined,
) {
  const locale = toPageLocale(localeParam)
  const path = SERVICE_ROUTES[serviceId]
  const pageKey = SEO_PAGE_KEY[path]
  const seo = resolveSeoStrings(pageKey, locale)
  const name =
    translateExact(locale, 'services', `items.${serviceId}.title`) ?? seo.title
  const description =
    translateExact(locale, 'services', `items.${serviceId}.shortDescription`) ??
    seo.description
  const serviceType =
    translateExact(locale, 'common', `breadcrumbs.${pageKey}`) ?? null
  const canonicalUrl = localizedCanonicalUrl(path, locale)

  return {
    ...localizedPageHead(pageKey, locale),
    scripts: [
      jsonLd(
        buildServiceStructuredData({
          locale,
          canonicalUrl,
          name,
          description,
          serviceType,
          plans: servicePricePlans(serviceId, locale),
        }),
      ),
    ],
  }
}
