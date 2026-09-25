import { useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getLocaleFromPath } from '@/lib/i18n-utils'
import { LANGUAGES } from '@/lib/languages'
import { useDeferredModule } from '@/lib/deferred-module'

const loadPanel = () => import('@/components/LanguageSwitcherPanel')

/**
 * The language button. Server-rendered as a plain button; the popover
 * (search, regions, list) is a separate chunk, loaded when the pointer or
 * keyboard focus reaches the button, so Radix Popover and floating-ui are not
 * part of the entry chunk every page downloads.
 */
export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const currentLanguage =
    LANGUAGES.find((l) => l.code === currentLocale) ?? LANGUAGES[0]
  const [panel, loadPanelModule] = useDeferredModule(loadPanel)
  const Panel = panel?.LanguageSwitcherPanel

  const preload = () => {
    void loadPanelModule()
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className="h-9 gap-1.5 px-2.5"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-state={open ? 'open' : 'closed'}
        onPointerEnter={preload}
        onFocus={preload}
        onClick={() => {
          preload()
          setOpen((value) => !value)
        }}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden text-xs font-medium sm:inline">
          {currentLanguage.nativeName}
        </span>
        <span className="text-xs font-medium sm:hidden">
          {currentLanguage.code.split('-')[0].toUpperCase()}
        </span>
        <span className="sr-only">{t('languageSwitcher.srLabel')}</span>
      </Button>
      {Panel && (
        <Panel
          open={open}
          onOpenChange={setOpen}
          anchorRef={triggerRef}
          currentLocale={currentLocale}
        />
      )}
    </>
  )
}
