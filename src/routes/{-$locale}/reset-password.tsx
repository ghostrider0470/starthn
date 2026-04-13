import {
  createFileRoute,
  useNavigate,
  useLocation,
} from '@tanstack/react-router'
import { useState, useEffect } from 'react'
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
import { CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { z } from 'zod'
import api from '@/services/api'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

const searchSchema = z.object({
  token: z.string(),
  email: z.string().email().optional(),
})

export const Route = createFileRoute('/{-$locale}/reset-password')({
  ssr: false,
  validateSearch: searchSchema,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const { token, email } = Route.useSearch()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    if (!token) {
      navigate({ to: withLocalePath('/forgot-password', currentLocale) })
    }
  }, [token, navigate, currentLocale])

  const validatePassword = (pass: string): string[] => {
    const errors: string[] = []
    if (pass.length < 8) errors.push(t('reset.validation.length'))
    if (!/[A-Z]/.test(pass))
      errors.push(t('reset.validation.uppercase'))
    if (!/[a-z]/.test(pass))
      errors.push(t('reset.validation.lowercase'))
    if (!/[0-9]/.test(pass))
      errors.push(t('reset.validation.number'))
    if (!/[^A-Za-z0-9]/.test(pass))
      errors.push(t('reset.validation.special'))
    return errors
  }

  useEffect(() => {
    if (password) {
      setValidationErrors(validatePassword(password))
    } else {
      setValidationErrors([])
    }
  }, [password, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError(t('reset.messages.passwordMismatch'))
      return
    }

    if (validationErrors.length > 0) {
      setError(t('reset.messages.requirementsMissing'))
      return
    }

    setIsLoading(true)

    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        newPassword: password,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          t('reset.messages.errorFallback'),
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
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{t('reset.success.title')}</CardTitle>
            <CardDescription className="mt-2">
              {t('reset.success.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                navigate({ to: withLocalePath('/login', currentLocale) })
              }
              className="w-full"
            >
              {t('reset.success.button')}
            </Button>
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
            src="/logo-128.webp"
            alt="Start HN"
            className="mx-auto mb-6 h-16 w-auto"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('reset.form.title')}</CardTitle>
            <CardDescription>
              {t('reset.form.description')}
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
                <Label htmlFor="password">
                  {t('reset.form.newPassword')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t(
                      'pages.auth.reset.form.newPasswordPlaceholder',
                    )}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoFocus
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showPassword
                        ? t('reset.form.hidePassword')
                        : t('reset.form.showPassword')}
                    </span>
                  </Button>
                </div>
                {password && validationErrors.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <p className="text-muted-foreground">
                      {t('reset.form.passwordMustHave')}
                    </p>
                    {validationErrors.map((err) => (
                      <p
                        key={err}
                        className="flex items-center gap-1 text-destructive"
                      >
                        <span className="text-xs">x</span> {err}
                      </p>
                    ))}
                  </div>
                )}
                {password && validationErrors.length === 0 && (
                  <p className="flex items-center gap-1 text-xs text-foreground">
                    <span>✓</span> {t('reset.form.requirementsMet')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t('reset.form.confirmPassword')}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t(
                      'pages.auth.reset.form.confirmPasswordPlaceholder',
                    )}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword
                        ? t('reset.form.hidePassword')
                        : t('reset.form.showPassword')}
                    </span>
                  </Button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">
                    {t('reset.form.passwordsNoMatch')}
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="flex items-center gap-1 text-xs text-foreground">
                    <span>✓</span> {t('reset.form.passwordsMatch')}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  !password ||
                  !confirmPassword ||
                  password !== confirmPassword ||
                  validationErrors.length > 0
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('reset.form.resetting')}
                  </>
                ) : (
                  t('reset.form.submit')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('reset.form.needHelp')}{' '}
          <a
            href="mailto:support@horizonhub.tech"
            className="underline underline-offset-4 hover:text-primary"
          >
            {t('reset.form.contactSupport')}
          </a>
        </p>
      </div>
    </div>
  )
}
