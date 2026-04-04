import { Link, useLocation } from '@tanstack/react-router'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { Button } from '@/components/ui/button'
import { StandardCard } from '@/components/ui/standard-card'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export function RouteErrorBoundary({
  error,
  info,
  reset,
}: ErrorComponentProps<unknown>) {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const locale = getLocaleFromPath(location.pathname)

  useEffect(() => {
    // Keep a readable payload in console for quick debugging and telemetry hooks.
    console.error('[RouteErrorBoundary] Route runtime error', {
      path: location.pathname,
      error,
      info,
    })
  }, [error, info, location.pathname])

  const errorMessage =
    error instanceof Error && error.message
      ? error.message
      : t('error.runtime.unknown')

  return (
    <>
    <Navbar />
    <div className="pt-16">
    <PageContainer maxWidth="xl" spacing="md">
      <SectionContainer spacing="xl" align="center">
        <StandardCard
          variant="accent"
          className="mx-auto max-w-3xl border-destructive/30 bg-background/80 text-center backdrop-blur"
        >
          <div className="space-y-5">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
              <AlertTriangle className={cn(designSystem.icons.size.lg, 'text-destructive')} />
            </div>

            <div className="space-y-3">
              <p className={cn(designSystem.typography.display.eyebrow, 'text-destructive')}>
                {t('error.runtime.badge')}
              </p>
              <h1 className={designSystem.typography.display.pageTitle}>
                {t('error.runtime.title')}
              </h1>
              <p
                className={cn(
                  designSystem.typography.body.large,
                  designSystem.typography.muted,
                  'mx-auto max-w-2xl',
                )}
              >
                {t('error.runtime.description')}
              </p>
            </div>

            <StandardCard
              variant="muted"
              padding="compact"
              className="mx-auto max-w-2xl text-left"
            >
              <p
                className={cn(
                  designSystem.typography.body.xs,
                  'font-mono break-words text-muted-foreground',
                )}
              >
                {errorMessage}
              </p>
            </StandardCard>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={reset} size="lg">
                <RefreshCcw className={designSystem.icons.size.sm} />
                {t('error.runtime.retry')}
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to={withLocalePath('/', locale)}>
                  {t('error.runtime.home')}
                </Link>
              </Button>
            </div>
          </div>
        </StandardCard>
      </SectionContainer>
    </PageContainer>
    </div>
    <Footer />
    </>
  )
}
