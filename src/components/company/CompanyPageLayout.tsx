import type { ReactNode } from 'react'
import i18n from '@/i18n'
import { SectionScroller } from '@/components/landing/SectionScroller'
import { DEFAULT_LOCALE, isValidLocale } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

export type CompanySectionId =
  | 'overview'
  | 'story'
  | 'proof'
  | 'gallery'
  | 'values'
  | 'team'
  | 'culture'
  | 'jobs'
  | 'process'
  | 'channels'
  | 'contact'
  | 'start'

type CompanyPagePanelTone = 'default' | 'muted' | 'accent'

const panelToneClasses: Record<CompanyPagePanelTone, string> = {
  default: 'bg-background',
  muted: 'bg-muted/15',
  accent: 'bg-primary/[0.04]',
}

interface CompanyPageLayoutProps {
  children: ReactNode
  labels: ReadonlyArray<string>
  ids: ReadonlyArray<string>
}

interface CompanyPagePanelProps {
  children: ReactNode
  className?: string
  tone?: CompanyPagePanelTone
}

/**
 * Scroller labels from common:sections.* in the page's locale.
 *
 * A plain function called during render (not a hook). getFixedT on the
 * shared i18n instance is safe for concurrent SSR requests: it pins the
 * language explicitly and every per-request clone shares the same store.
 * A locale without the key yields '' (never a raw key), and the scroller then
 * uses its generic "go to section N" label.
 */
export function getCompanySectionLabels(
  locale: string,
  ids: ReadonlyArray<CompanySectionId>,
) {
  const lng = isValidLocale(locale) ? locale : DEFAULT_LOCALE
  const t = i18n.getFixedT(lng, 'common')
  return ids.map((id) =>
    i18n.exists(`sections.${id}`, { lng, ns: 'common', fallbackLng: false })
      ? t(`sections.${id}`)
      : '',
  )
}

export function CompanyPageLayout({
  children,
  labels,
  ids,
}: CompanyPageLayoutProps) {
  return (
    <main className="bg-background">
      <SectionScroller labels={[...labels]} ids={[...ids]}>
        {children}
      </SectionScroller>
    </main>
  )
}

export function CompanyPagePanel({
  children,
  className,
  tone = 'default',
}: CompanyPagePanelProps) {
  return (
    <section
      className={cn(
        'flex flex-col justify-center pt-8 pb-28 md:py-10',
        panelToneClasses[tone],
        className,
      )}
    >
      {children}
    </section>
  )
}
