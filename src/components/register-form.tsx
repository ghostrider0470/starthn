import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'
import oauthService from '@/services/oauth.service'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register, error } = useAuth()
  const navigate = useNavigate()
  const currentLocale = getLocaleFromPath(window.location.pathname)
  const { t } = useTranslation('auth')

  // Form fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setValidationError(t('register.passwordsNoMatch'))
      return
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setValidationError(t('register.passwordTooShort'))
      return
    }

    setIsLoading(true)

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      })
      setRegistrationSuccess(true)
      setTimeout(() => navigate({ to: withLocalePath('/dashboard', currentLocale) }), 2000)
    } catch (err) {
      // Error is handled in the auth context
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }))
  }

  const handleMicrosoftSignup = async () => {
    await oauthService.initiateMicrosoftLogin()
  }

  const handleGoogleSignup = async () => {
    await oauthService.initiateGoogleLogin()
  }

  if (registrationSuccess) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Alert className="border-primary/20 bg-primary/10">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            {t('register.successMessage')}
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <a href={withLocalePath('/login', currentLocale)}>{t('register.signIn')}</a>
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center text-center">
            <img
              src="/logo-128.webp"
              alt="Start HN"
              className="h-16 w-auto mb-4"
              width={64}
              height={64}
            />
            <h1 className="text-2xl font-bold">{t('register.title')}</h1>
            <p className="text-muted-foreground text-balance">
              {t('register.subtitle')}
            </p>
          </div>

          {(error || validationError) && (
            <Alert variant="destructive">
              <AlertDescription>{error || validationError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="firstName">{t('register.firstName')}</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder={t('register.firstNamePlaceholder')}
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">{t('register.lastName')}</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder={t('register.lastNamePlaceholder')}
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t('register.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t('register.emailPlaceholder')}
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t('register.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
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
                    {showPassword ? t('register.hidePassword') : t('register.showPassword')}
                  </span>
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">{t('register.confirmPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
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
                    {showConfirmPassword ? t('register.hidePassword') : t('register.showPassword')}
                  </span>
                </Button>
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('register.creatingAccount')}
              </>
            ) : (
              t('register.submit')
            )}
          </Button>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              {t('register.orContinueWith')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              type="button" 
              className="w-full" 
              disabled={isLoading}
              onClick={handleGoogleSignup}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              <span className="sr-only">{t('register.signUpWithGoogle')}</span>
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full"
              disabled={isLoading}
              onClick={handleMicrosoftSignup}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" className="h-5 w-5">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              <span className="sr-only">{t('register.signUpWithMicrosoft')}</span>
            </Button>
          </div>
          <div className="text-center text-sm">
            {t('register.hasAccount')}{' '}
            <a href={withLocalePath('/login', currentLocale)} className="underline underline-offset-4">
              {t('register.signIn')}
            </a>
          </div>
        </div>
      </form>
      <div className="text-muted-foreground text-center text-xs">
        {t('register.legalPrefix')}{' '}
        <a href={withLocalePath('/terms', currentLocale)} className="underline underline-offset-4 hover:text-primary">
          {t('register.termsOfService')}
        </a>{' '}
        {t('register.and')}{' '}
        <a href={withLocalePath('/privacy', currentLocale)} className="underline underline-offset-4 hover:text-primary">
          {t('register.privacyPolicy')}
        </a>
        .
      </div>
    </div>
  )
}
