import { WifiOff } from 'lucide-react'
import i18n from '@/i18n'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { StandardCard } from '@/components/ui/standard-card'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

interface OfflineFallbackProps {
  fullPage?: boolean
  className?: string
}

function getCurrentLocale() {
  if (typeof window === 'undefined') {
    return getLocaleFromPath('/')
  }

  return getLocaleFromPath(window.location.pathname)
}

export function OfflineFallback({
  fullPage = false,
  className,
}: OfflineFallbackProps) {
  const locale = getCurrentLocale()
  const t = i18n.getFixedT(locale, 'pages')
  const homeHref = withLocalePath('/', locale)

  if (fullPage) {
    return (
      <PageContainer
        maxWidth="md"
        spacing="lg"
        className={cn('flex min-h-[60vh] items-center', className)}
      >
        <StandardCard variant="gradient" className="w-full text-center">
          <WifiOff className="mx-auto mb-4 h-10 w-10 text-primary" aria-hidden />
          <h2 className={cn(designSystem.typography.heading.h3, 'mb-2')}>
            {t('error.offline.title')}
          </h2>
          <p
            className={cn(
              designSystem.typography.body.base,
              designSystem.typography.muted,
              'mx-auto mb-6 max-w-xl',
            )}
          >
            {t('error.offline.description')}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => window.location.reload()}>
              {t('error.runtime.retry')}
            </Button>
            <Button asChild variant="outline">
              <a href={homeHref}>{t('error.runtime.home')}</a>
            </Button>
          </div>
        </StandardCard>
      </PageContainer>
    )
  }

  return (
    <div className={cn('fixed inset-x-0 top-16 z-50 px-4 sm:px-6 lg:px-8', className)}>
      <div className="mx-auto max-w-4xl rounded-xl border border-primary/30 bg-background/95 p-4 shadow-md backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-primary" aria-hidden />
            <p className={cn(designSystem.typography.body.small, 'font-medium')}>
              {t('error.offline.banner')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            {t('error.runtime.retry')}
          </Button>
        </div>
      </div>
    </div>
  )
}
