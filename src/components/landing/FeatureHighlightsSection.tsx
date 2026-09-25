import { Database, ShieldCheck, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SlideUp } from '@/components/animations/FadeIn'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const FEATURES = [
  { key: 'digital', Icon: Database },
  { key: 'grow', Icon: TrendingUp },
  { key: 'licensed', Icon: ShieldCheck },
] as const

export function FeatureHighlightsSection() {
  const { t } = useTranslation('landing')

  return (
    <section className="relative bg-muted/30 py-12 md:py-14">
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <SlideUp offset={20} duration={0.5} className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t('features.overline')}
          </p>
          <h2 className="mt-3 font-heading text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {t('features.title')}
          </h2>
        </SlideUp>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {FEATURES.map(({ key, Icon }, i) => (
            <SlideUp
              as="article"
              key={key}
              offset={24}
              duration={0.55}
              delay={i * 0.09}
              className="group relative flex items-start gap-5 rounded-xl border-l-2 border-transparent p-4 transition-colors hover:border-primary hover:bg-background"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform group-hover:scale-110">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {t(`features.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`features.items.${key}.description`)}
                </p>
              </div>
            </SlideUp>
          ))}
        </div>
      </div>
    </section>
  )
}
