import { Link } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export function MobileHeader() {
  const currentLocale = getLocaleFromPath(window.location.pathname)

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-40 md:hidden w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "border-primary/20"
    )}>
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none z-0" />

      <div className="relative z-10 flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          to={withLocalePath('/', currentLocale)}
          className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md px-1"
        >
          <img
            src="/clean-square.png"
            alt="Horizon Tech"
            className="h-10 w-auto"
          />
        </Link>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  )
}
