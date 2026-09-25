import i18n from '@/i18n'
import { DEFAULT_LOCALE, isValidLocale } from '@/lib/i18n-utils'

/**
 * Section-scroller labels from common:sections.<key> in the page's locale,
 * for pages whose section keys are not CompanySectionIds (the homepage and
 * the services index).
 *
 * A plain function called during render (not a hook). getFixedT pins the
 * language explicitly, and every per-request i18n clone shares the same
 * resource store, so this is safe for concurrent SSR requests. A locale
 * without the key yields '' (never a raw key), and the scroller then uses
 * its generic "go to section N" label.
 */
export function getSectionLabels(
  locale: string,
  keys: ReadonlyArray<string>,
): Array<string> {
  const lng = isValidLocale(locale) ? locale : DEFAULT_LOCALE
  const t = i18n.getFixedT(lng, 'common')
  return keys.map((key) =>
    i18n.exists(`sections.${key}`, { lng, ns: 'common', fallbackLng: false })
      ? t(`sections.${key}`)
      : '',
  )
}
