import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/unauthorized')({
  component: UnauthorizedPage,
})

function UnauthorizedPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('unauthorized.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('unauthorized.description')}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={withLocalePath('/profile', currentLocale)}>
            <Button>{t('unauthorized.primary')}</Button>
          </Link>
          <Link to={withLocalePath('/', currentLocale)}>
            <Button variant="outline">
              {t('unauthorized.secondary')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
