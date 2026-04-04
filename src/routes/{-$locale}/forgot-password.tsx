import {
  createFileRoute,
  Link,
  useNavigate,
  useLocation,
} from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ArrowLeft, Mail, Loader2 } from 'lucide-react'
import api from '@/services/api'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await api.post('/auth/forgot-password', { email })
      setSuccess(true)
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          t('forgot.messages.errorFallback'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div
        className={cn(
          'min-h-screen flex items-center justify-center p-4',
          designSystem.effects.gradient.subtle,
        )}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{t('forgot.success.title')}</CardTitle>
            <CardDescription className="mt-2">
              {t('forgot.success.sentTo', { email })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              {t('forgot.success.description')}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigate({ to: withLocalePath('/login', currentLocale) })
                }
                className="w-full"
              >
                {t('forgot.success.backToLogin')}
              </Button>
              <button
                onClick={() => {
                  setSuccess(false)
                  setEmail('')
                }}
                className="min-h-11 rounded-md px-3 text-center text-sm text-muted-foreground hover:text-primary"
              >
                {t('forgot.success.retry')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center p-4',
        designSystem.effects.gradient.subtle,
      )}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/clean-square.png"
            alt="Horizon Tech"
            className="mx-auto mb-6 h-16 w-auto"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('forgot.form.title')}</CardTitle>
            <CardDescription>
              {t('forgot.form.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">
                  {t('forgot.form.emailLabel')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('forgot.form.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('forgot.form.sending')}
                  </>
                ) : (
                  t('forgot.form.submit')
                )}
              </Button>

              <div className="space-y-2 text-center">
                <Link to={withLocalePath('/login', currentLocale)}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('forgot.form.backToLogin')}
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('forgot.form.remember')}{' '}
          <Link
            to={withLocalePath('/login', currentLocale)}
            className="underline underline-offset-4 hover:text-primary"
          >
            {t('forgot.form.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
