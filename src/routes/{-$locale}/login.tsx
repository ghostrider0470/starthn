import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/components/login-form'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block overflow-hidden">
        {/* Gradient background with brand accent */}
        <div className={cn(
          'absolute inset-0',
          'bg-gradient-to-br from-primary/20 via-background to-accent/20',
        )} />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
          <img
            src="/clean-square.png"
            alt="Horizon Tech"
            className="h-32 w-auto mb-8 opacity-80"
            decoding="async"
          />
          <h2 className="text-2xl font-bold tracking-tight text-center mb-3">
            Horizon Tech Partner Portal
          </h2>
          <p className="text-muted-foreground text-center max-w-sm text-balance">
            Collaborate on projects, manage deliverables, and stay connected with the Horizon Tech team.
          </p>
        </div>
      </div>
    </div>
  )
}
