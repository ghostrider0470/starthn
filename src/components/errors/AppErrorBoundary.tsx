import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCcw, WifiOff } from 'lucide-react'
import i18n from '@/i18n'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { StandardCard } from '@/components/ui/standard-card'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
  error?: unknown
}

function getLocaleFromWindow() {
  if (typeof window === 'undefined') {
    return getLocaleFromPath('/')
  }

  return getLocaleFromPath(window.location.pathname)
}

function isOfflineError(error: unknown) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true
  }

  const message = error instanceof Error
    ? error.message.toLowerCase()
    : String(error ?? '').toLowerCase()

  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('importing a module script failed')
  )
}

function AppErrorFallback({
  error,
  onTryAgain,
}: {
  error?: unknown
  onTryAgain: () => void
}) {
  const locale = getLocaleFromWindow()
  const t = i18n.getFixedT(locale, 'pages')
  const homeHref = withLocalePath('/', locale)
  const offline = isOfflineError(error)

  return (
    <PageContainer maxWidth="md" spacing="lg" className="flex min-h-[65vh] items-center">
      <div className="w-full">
        <PageHeader
          align="center"
          kicker={t('error.runtime.badge')}
          title={offline ? t('error.offline.title') : t('error.runtime.title')}
          description={
            offline
              ? t('error.offline.description')
              : t('error.runtime.description')
          }
        />

        <StandardCard variant="accent" className="mx-auto max-w-2xl text-center">
          <div className="space-y-6">
            <div
              className={cn(
                'mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border',
                offline
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-destructive/40 bg-destructive/10',
              )}
            >
              {offline ? (
                <WifiOff className={cn(designSystem.icons.size.lg, 'text-primary')} />
              ) : (
                <AlertTriangle className={cn(designSystem.icons.size.lg, 'text-destructive')} />
              )}
            </div>

            <p
              className={cn(
                designSystem.typography.body.small,
                designSystem.typography.muted,
                'mx-auto max-w-xl',
              )}
            >
              {offline ? t('error.offline.hint') : t('error.runtime.hint')}
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={onTryAgain} size="lg">
                <RefreshCcw className={designSystem.icons.size.sm} />
                {t('error.runtime.retry')}
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={homeHref}>{t('error.runtime.home')}</a>
              </Button>
            </div>
          </div>
        </StandardCard>
      </div>
    </PageContainer>
  )
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    error: undefined,
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary] Application runtime error', {
        error,
        errorInfo,
      })
    }
  }

  handleTryAgain = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppErrorFallback
          error={this.state.error}
          onTryAgain={this.handleTryAgain}
        />
      )
    }

    return this.props.children
  }
}
