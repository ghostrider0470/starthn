import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import authService from '@/services/auth.service'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export function FirstTimeSetup() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const currentLocale = getLocaleFromPath(window.location.pathname)

  const user = authService.getCurrentUser()

  const handleComplete = () => {
    navigate({ to: withLocalePath('/profile', currentLocale) })
  }

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4", designSystem.effects.gradient.subtle)}>
      <div className="max-w-xl w-full text-center">
        <img
          src="/logo-128.webp"
          alt="Horizon Tech"
          className="h-16 w-auto mx-auto mb-6"
          width={64}
          height={64}
        />
        <h1 className={cn(designSystem.typography.heading.h1, "mb-2")}>
          {t('setup.welcome', { name: user?.firstName || 'User' })}
        </h1>
        <p className={cn(designSystem.typography.body.large, designSystem.typography.muted, "mb-8")}>
          {t('setup.subtitle')}
        </p>

        <Button
          size="lg"
          onClick={handleComplete}
          className="min-w-[200px]"
        >
          {t('setup.complete')}
        </Button>
      </div>
    </div>
  )
}
