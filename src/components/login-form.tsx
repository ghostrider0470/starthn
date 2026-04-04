import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import oauthService from '@/services/oauth.service'
import { TwoFactorVerification } from '@/components/TwoFactorVerification'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const { login, error } = useAuth()
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentLocale = getLocaleFromPath(window.location.pathname)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLocalError(null)

    try {
      await login({ email, password })
      
      // Check token claims for redirect logic
      const token = localStorage.getItem('accessToken')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          if (payload.is_first_time_setup === 'true') {
            navigate({ to: withLocalePath('/first-time-setup', currentLocale) })
            return
          }
          const roles = Array.isArray(payload.role) ? payload.role : [payload.role]
          if (roles.includes('MasterAdmin')) {
            navigate({ to: withLocalePath('/admin', currentLocale) })
            return
          }
        } catch (error) {
          console.error('Failed to decode token:', error)
        }
      }

      navigate({ to: withLocalePath('/dashboard', currentLocale) })
    } catch (err: any) {
      // Check if 2FA is required
      if (err?.response?.data?.message === '2FA_REQUIRED') {
        setRequires2FA(true)
        setLocalError(null) // Clear any error when 2FA is required
      } else {
        setLocalError(err?.response?.data?.message || error || 'Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FASuccess = async () => {
    console.log('2FA Success handler called');
    
    // Invalidate the user profile query to trigger a refresh
    await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    
    // Small delay to ensure token is properly saved and context updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check token claims for redirect logic
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.is_first_time_setup === 'true') {
          navigate({ to: withLocalePath('/first-time-setup', currentLocale) })
          return
        }
        const roles = Array.isArray(payload.role) ? payload.role : [payload.role]
        if (roles.includes('MasterAdmin')) {
          window.location.href = withLocalePath('/admin', currentLocale)
          return
        }
      } catch (error) {
        console.error('Failed to decode token:', error)
      }
    }

    // Use window.location for hard navigation to ensure fresh auth check
    window.location.href = withLocalePath('/dashboard', currentLocale)
  }

  const handle2FACancel = () => {
    setRequires2FA(false)
    setEmail('')
    setPassword('')
    setLocalError(null)
  }

  const handleGoogleLogin = async () => {
    await oauthService.initiateGoogleLogin()
  }
  
  const handleMicrosoftLogin = async () => {
    await oauthService.initiateMicrosoftLogin()
  }

  // Show 2FA verification if required
  if (requires2FA) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <TwoFactorVerification
          email={email}
          onSuccess={handle2FASuccess}
          onCancel={handle2FACancel}
        />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center text-center">
            <img
              src="/clean-square.png"
              alt="Horizon Tech"
              className="h-16 w-auto mb-4"
            />
            <h1 className="text-2xl font-bold">{t('login.title')}</h1>
            <p className="text-muted-foreground text-balance">
              {t('login.subtitle')}
            </p>
          </div>

          {(localError || (!requires2FA && error && error !== '2FA_REQUIRED')) && (
            <Alert variant="destructive">
              <AlertDescription>{localError || error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3">
            <Label htmlFor="email">{t('login.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid gap-3">
            <div className="flex items-center">
              <Label htmlFor="password">{t('login.password')}</Label>
              <a
                href={withLocalePath('/forgot-password', currentLocale)}
                className="ml-auto text-sm underline-offset-2 hover:underline"
              >
                {t('login.forgotPassword')}
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  {showPassword ? t('login.hidePassword') : t('login.showPassword')}
                </span>
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('login.loggingIn')}
              </>
            ) : (
              t('login.submit')
            )}
          </Button>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              {t('login.orContinueWith')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              type="button" 
              className="w-full" 
              disabled={isLoading}
              onClick={handleGoogleLogin}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              <span className="sr-only">{t('login.loginWithGoogle')}</span>
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full"
              disabled={isLoading}
              onClick={handleMicrosoftLogin}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" className="h-5 w-5">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              <span className="sr-only">{t('login.loginWithMicrosoft')}</span>
            </Button>
          </div>
          <div className="text-center text-sm">
            {t('login.noAccount')}{' '}
            <a href={withLocalePath('/register', currentLocale)} className="underline underline-offset-4">
              {t('login.signUp')}
            </a>
          </div>
        </div>
      </form>
      <div className="text-muted-foreground text-center text-xs">
        {t('login.legalPrefix')}{' '}
        <a href={withLocalePath('/terms', currentLocale)} className="underline underline-offset-4 hover:text-primary">
          {t('login.termsOfService')}
        </a>{' '}
        {t('login.and')}{' '}
        <a href={withLocalePath('/privacy', currentLocale)} className="underline underline-offset-4 hover:text-primary">
          {t('login.privacyPolicy')}
        </a>
        .
      </div>
    </div>
  )
}
