import type { ReactNode } from 'react'
import { SectionScroller } from '@/components/landing/SectionScroller'
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

const SECTION_LABELS: Record<'en' | 'bs', Record<CompanySectionId, string>> = {
  en: {
    overview: 'Overview',
    story: 'Story',
    proof: 'Proof',
    gallery: 'Gallery',
    values: 'Values',
    team: 'Team',
    culture: 'Culture',
    jobs: 'Jobs',
    process: 'Process',
    channels: 'Channels',
    contact: 'Contact',
    start: 'Start',
  },
  bs: {
    overview: 'Pregled',
    story: 'Priča',
    proof: 'Dokaz',
    gallery: 'Galerija',
    values: 'Vrijednosti',
    team: 'Tim',
    culture: 'Kultura',
    jobs: 'Pozicije',
    process: 'Proces',
    channels: 'Kanali',
    contact: 'Kontakt',
    start: 'Početak',
  },
}

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

export function getCompanySectionLabels(
  locale: string,
  ids: ReadonlyArray<CompanySectionId>,
) {
  const language = locale.startsWith('bs') ? 'bs' : 'en'
  return ids.map((id) => SECTION_LABELS[language][id])
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
