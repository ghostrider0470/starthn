import { createFileRoute } from '@tanstack/react-router'
import { RegisterForm } from '@/components/register-form'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/register')({
  component: RegisterPage,
})

function RegisterPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className={cn('flex flex-col', designSystem.spacing.gap.md, 'p-6 md:p-10')}>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <RegisterForm />
          </div>
        </div>
      </div>
      <div className={cn('relative hidden lg:block', designSystem.effects.gradient.muted)}>
        <img
          src="/placeholder.svg"
          alt="Horizon Tech"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
