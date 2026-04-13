import {
  createFileRoute,
  useNavigate,
  useLocation,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import authService from '@/services/auth.service'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2, Mail, AlertCircle } from 'lucide-react'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

const searchSchema = z.object({
  userId: z.string(),
  token: z.string(),
})

export const Route = createFileRoute('/{-$locale}/confirm-email')({
  ssr: false,
  validateSearch: searchSchema.partial(),
  component: ConfirmEmailPage,
})

function ConfirmEmailPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const searchParams = Route.useSearch()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  )
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const confirmEmail = async () => {
      const { userId, token } = searchParams

      if (!userId || !token) {
        setStatus('error')
        setMessage(t('confirm.messages.invalidLink'))
        return
      }

      try {
        const response = await authService.confirmEmail(userId, token)
        setStatus('success')
        setMessage(
          response.message || t('confirm.messages.successFallback'),
        )
      } catch (error: any) {
        setStatus('error')
        setMessage(
          error.response?.data?.message ||
            t('confirm.messages.errorFallback'),
        )
      }
    }

    confirmEmail()
  }, [searchParams, t])

  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center p-4',
        designSystem.effects.gradient.subtle,
      )}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          {status === 'success' && (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
          )}
          {status === 'error' && (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
          )}
          <CardTitle>
            {status === 'loading' && t('confirm.state.loadingTitle')}
            {status === 'success' && t('confirm.state.successTitle')}
            {status === 'error' && t('confirm.state.errorTitle')}
          </CardTitle>
          <CardDescription className="mt-2">
            {status === 'loading' &&
              t('confirm.state.loadingDescription')}
            {status === 'success' &&
              t('confirm.state.successDescription')}
            {status === 'error' &&
              t('confirm.state.errorDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === 'success' && (
            <>
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center">
                <p className="text-sm text-foreground">{message}</p>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {t('confirm.success.nextStep')}
              </p>
              <Button
                onClick={() =>
                  navigate({ to: withLocalePath('/login', currentLocale) })
                }
                className="w-full"
                size="lg"
              >
                {t('confirm.success.loginButton')}
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                  <p className="ml-3 text-sm text-destructive">{message}</p>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {t('confirm.error.helpText')}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() =>
                    navigate({ to: withLocalePath('/register', currentLocale) })
                  }
                  variant="outline"
                  className="flex-1"
                >
                  {t('confirm.error.registerButton')}
                </Button>
                <Button
                  onClick={() =>
                    navigate({ to: withLocalePath('/login', currentLocale) })
                  }
                  className="flex-1"
                >
                  {t('confirm.error.loginButton')}
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {t('confirm.error.supportPrefix')}{' '}
                <a
                  href={withLocalePath('/contact', currentLocale)}
                  className="text-foreground hover:text-primary hover:underline"
                >
                  {t('confirm.error.supportLink')}
                </a>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
