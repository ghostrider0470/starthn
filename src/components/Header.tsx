import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { ArrowRight, Sparkles } from 'lucide-react'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export default function Header() {
  const { t } = useTranslation()
  const currentLocale = getLocaleFromPath(window.location.pathname)

  return (
    <header className="relative py-20 md:py-32 bg-gradient-to-br from-background via-primary/5 to-accent/5 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className={cn(designSystem.typography.body.small, "font-medium text-primary")}>
              {t('header.badge')}
            </span>
          </div>

          {/* Main Heading */}
          <h1 className={cn(
            designSystem.typography.heading.h1,
            "mb-6 bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent",
            "text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
          )}>
            {t('header.titleLine1')}
            <span className="block bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              {t('header.titleLine2')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className={cn(
            designSystem.typography.body.large,
            designSystem.typography.muted,
            "mb-10 max-w-3xl mx-auto leading-relaxed"
          )}>
            {t('header.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={withLocalePath('/contact', currentLocale)}>
              <Button size="lg" className="min-w-[200px] shadow-lg hover:shadow-xl transition-all">
                {t('header.getStarted')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="min-w-[200px] hover:bg-primary/5 border-primary/30">
              {t('header.exploreSolutions')}
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-border/50">
            <p className={cn(designSystem.typography.body.small, designSystem.typography.muted, "mb-6")}>
              {t('header.trustedBy')}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-sm font-semibold">{t('header.microsoftPartner')}</div>
              <div className="w-px h-4 bg-border" />
              <div className="text-sm font-semibold">{t('header.azureCertified')}</div>
              <div className="w-px h-4 bg-border" />
              <div className="text-sm font-semibold">{t('header.enterpriseSolutions')}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
