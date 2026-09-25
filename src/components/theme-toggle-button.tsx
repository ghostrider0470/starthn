import { useEffect, useRef } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { useDeferredModule } from '@/lib/deferred-module'

/** The theme button (sun/moon). The menu itself lives in theme-toggle.tsx. */
export function ThemeToggleButton(props: ComponentProps<typeof Button>) {
  const { t } = useTranslation('common')
  return (
    <Button variant="ghost" size="icon" className="h-9 w-9" {...props}>
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">
        {t('a11y.toggleTheme', { defaultValue: 'Toggle theme' })}
      </span>
    </Button>
  )
}

const loadThemeToggle = () => import('@/components/theme-toggle')

/**
 * The header theme toggle, without Radix DropdownMenu in the entry chunk:
 * a plain button until the menu module loads (when `preload` turns true, or
 * on hover, focus or a click), then the real toggle in its place, opened
 * and/or focused if the visitor already clicked or tabbed to it.
 */
export function DeferredThemeToggle({
  preload = false,
}: {
  preload?: boolean
}) {
  const [module, load] = useDeferredModule(loadThemeToggle)
  const intent = useRef({ open: false, focus: false })

  useEffect(() => {
    if (preload) void load()
  }, [preload, load])

  if (module) {
    const { ThemeToggle } = module
    return (
      <ThemeToggle
        defaultOpen={intent.current.open}
        autoFocus={intent.current.focus}
      />
    )
  }

  return (
    <ThemeToggleButton
      aria-haspopup="menu"
      aria-expanded={false}
      data-state="closed"
      onPointerEnter={() => void load()}
      onFocus={() => {
        intent.current.focus = true
        void load()
      }}
      onBlur={() => {
        intent.current.focus = false
      }}
      onClick={() => {
        intent.current.open = true
        void load()
      }}
    />
  )
}
