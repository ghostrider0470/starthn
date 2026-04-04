import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import oauthService from '@/services/oauth.service'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

const callbackSearchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

export const Route = createFileRoute('/{-$locale}/auth/callback')({
  validateSearch: callbackSearchSchema,
  component: OAuthCallback,
})

// Module-level guards prevent double execution from React StrictMode remounts.
// _cancelled is reset on each mount so StrictMode's fake unmount doesn't kill the async work.
let _processing = false
let _cancelled = false

function navigateAfterLogin(currentLocale: string, navigate: ReturnType<typeof useNavigate>) {
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
    } catch (e) {
      console.error('Failed to decode token:', e)
    }
  }

  navigate({ to: withLocalePath('/profile', currentLocale) })
}

function OAuthCallback() {
  const navigate = useNavigate()
  const { externalLogin } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const currentLocale = getLocaleFromPath(window.location.pathname)

  useEffect(() => {
    _cancelled = false
    if (_processing) return
    _processing = true

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const state = params.get('state')
        const oauthError = params.get('error')
        const errorDescription = params.get('error_description')

        if (oauthError) {
          setError(errorDescription || 'OAuth authentication failed')
          setIsProcessing(false)
          _processing = false
          return
        }

        // Strip params so a manual reload can't re-use the code
        window.history.replaceState({}, '', window.location.pathname)

        if (code && state?.startsWith('Microsoft_')) {
          console.log('[OAuth] Starting Microsoft code exchange...')
          const tokenResponse = await oauthService.exchangeCodeForTokens(code, 'Microsoft', state)
          console.log('[OAuth] Exchange response:', { hasIdToken: !!tokenResponse.id_token, hasAccessToken: !!tokenResponse.access_token })
          if (_cancelled) return
          await externalLogin({ provider: 'Microsoft', idToken: tokenResponse.id_token })
          console.log('[OAuth] External login complete, stored token:', !!localStorage.getItem('accessToken'))
          if (_cancelled) return
          navigateAfterLogin(currentLocale, navigate)
          return
        }

        if (code && state?.startsWith('Google_')) {
          const tokenResponse = await oauthService.exchangeCodeForTokens(code, 'Google', state)
          if (_cancelled) return
          await externalLogin({ provider: 'Google', idToken: tokenResponse.id_token })
          if (_cancelled) return
          navigateAfterLogin(currentLocale, navigate)
          return
        }

        // No valid auth data
        setError('No authorization data received')
        setIsProcessing(false)
        _processing = false
      } catch (err: any) {
        if (_cancelled) return
        console.error('OAuth callback error:', err)

        let errorMessage = 'Authentication failed'
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message
        } else if (err.response?.data) {
          errorMessage =
            typeof err.response.data === 'string'
              ? err.response.data
              : JSON.stringify(err.response.data)
        } else if (err.message) {
          errorMessage = err.message
        }

        setError(errorMessage)
        setIsProcessing(false)
        _processing = false
        oauthService.clearOAuthData()
      }
    }

    handleCallback()

    return () => {
      _cancelled = true
    }
  }, [currentLocale, externalLogin, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              onClick={() => navigate({ to: withLocalePath('/login', currentLocale) })}
              className="flex-1 min-h-11 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h2 className="text-xl font-semibold">Completing sign in...</h2>
          <p className="text-muted-foreground">Please wait while we authenticate you</p>
        </div>
      </div>
    )
  }

  return null
}
