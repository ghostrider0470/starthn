import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Check, Globe, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  getLocaleFromPath,
  stripLocalePrefix,
  withLocalePath,
} from '@/lib/i18n-utils'
import type { SupportedLocale } from '@/lib/i18n-utils'
import { LANGUAGES, countryCodeToEmoji } from '@/lib/languages'
import type { LanguageMeta } from '@/lib/languages'
import { cn } from '@/lib/utils'

/* ── Region mapping ──────────────────────────────────────────────────────── */

type Region = 'all' | 'europe' | 'asia' | 'middle-east' | 'africa' | 'americas' | 'pacific'

const REGION_TABS: { id: Region; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'europe', label: 'Europe' },
  { id: 'americas', label: 'Americas' },
  { id: 'asia', label: 'Asia' },
  { id: 'middle-east', label: 'Middle East' },
  { id: 'africa', label: 'Africa' },
  { id: 'pacific', label: 'Pacific' },
]

const COUNTRY_TO_REGION: Record<string, Region> = {
  // Europe
  AL: 'europe', AM: 'europe', AT: 'europe', AZ: 'europe', BA: 'europe',
  BE: 'europe', BG: 'europe', BY: 'europe', CH: 'europe', CZ: 'europe',
  DE: 'europe', DK: 'europe', EE: 'europe', ES: 'europe', FI: 'europe',
  FO: 'europe', FR: 'europe', GB: 'europe', GE: 'europe', GR: 'europe',
  HR: 'europe', HU: 'europe', IE: 'europe', IS: 'europe', IT: 'europe',
  LT: 'europe', LU: 'europe', LV: 'europe', MK: 'europe', MT: 'europe',
  NL: 'europe', NO: 'europe', PL: 'europe', PT: 'europe', RO: 'europe',
  RS: 'europe', RU: 'europe', SE: 'europe', SI: 'europe', SK: 'europe',
  UA: 'europe',
  // Americas
  BR: 'americas', CA: 'americas', HT: 'americas', MX: 'americas', US: 'americas',
  // Asia
  BD: 'asia', CN: 'asia', HK: 'asia', ID: 'asia', IN: 'asia',
  JP: 'asia', KG: 'asia', KH: 'asia', KR: 'asia', KZ: 'asia',
  LA: 'asia', LK: 'asia', MM: 'asia', MN: 'asia', MY: 'asia',
  NP: 'asia', PH: 'asia', SG: 'asia', TH: 'asia', TM: 'asia',
  TW: 'asia', UZ: 'asia', VN: 'asia',
  // Middle East
  AF: 'middle-east', IL: 'middle-east', IQ: 'middle-east', IR: 'middle-east',
  PK: 'middle-east', SA: 'middle-east', TR: 'middle-east',
  // Africa
  BI: 'africa', CD: 'africa', ER: 'africa', ET: 'africa', MG: 'africa',
  MV: 'africa', MW: 'africa', NG: 'africa', RW: 'africa', SO: 'africa',
  TZ: 'africa', UG: 'africa', ZA: 'africa', ZW: 'africa',
  // Pacific
  FJ: 'pacific', NZ: 'pacific', PF: 'pacific', TO: 'pacific', WS: 'pacific',
}

function getRegion(language: LanguageMeta): Region {
  if (!language.countryCode) return 'europe'
  return COUNTRY_TO_REGION[language.countryCode] ?? 'europe'
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function buildLocalizedPath(
  pathname: string,
  targetLocale: SupportedLocale,
): string {
  return withLocalePath(stripLocalePrefix(pathname), targetLocale)
}

/* ── Main Component ──────────────────────────────────────────────────────── */

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeRegion, setActiveRegion] = useState<Region>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const pathname = location.pathname
  const currentLocale = getLocaleFromPath(pathname)
  const currentLanguage =
    LANGUAGES.find((l) => l.code === currentLocale) ?? LANGUAGES[0]

  const sortedLanguages = useMemo(
    () =>
      [...LANGUAGES].sort((a, b) =>
        a.nativeName.localeCompare(b.nativeName, 'en', { sensitivity: 'base' }),
      ),
    [],
  )

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(timer)
    }
    setQuery('')
    setActiveRegion('all')
    return undefined
  }, [open])

  const isSearching = query.trim().length > 0

  const displayLanguages = useMemo(() => {
    let list = sortedLanguages

    // Apply search filter
    if (isSearching) {
      const normalized = query.trim().toLowerCase()
      list = list.filter(
        (lang) =>
          lang.code.toLowerCase().includes(normalized) ||
          lang.name.toLowerCase().includes(normalized) ||
          lang.nativeName.toLowerCase().includes(normalized),
      )
    }

    // Apply region filter (only when not searching)
    if (!isSearching && activeRegion !== 'all') {
      list = list.filter((lang) => getRegion(lang) === activeRegion)
    }

    return list
  }, [sortedLanguages, query, activeRegion, isSearching])

  // Count languages per region for tab badges
  const regionCounts = useMemo(() => {
    const counts: Partial<Record<Region, number>> = {}
    for (const lang of sortedLanguages) {
      const r = getRegion(lang)
      counts[r] = (counts[r] ?? 0) + 1
    }
    return counts
  }, [sortedLanguages])

  const switchLocale = useCallback(
    async (newLocale: SupportedLocale) => {
      if (newLocale === currentLocale) return

      const currentPath = window.location.pathname
      const search = window.location.search || ''
      const hash = window.location.hash || ''
      const newPath = buildLocalizedPath(currentPath, newLocale)

      setOpen(false)
      await i18n.changeLanguage(newLocale)
      window.location.replace(`${newPath}${search}${hash}`)
    },
    [currentLocale, i18n],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5">
          <Globe className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:inline">
            {currentLanguage.nativeName}
          </span>
          <span className="text-xs font-medium sm:hidden">
            {currentLanguage.code.split('-')[0].toUpperCase()}
          </span>
          <span className="sr-only">{t('languageSwitcher.srLabel')}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] p-0"
      >
        {/* Search */}
        <div className="border-b px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('languageSwitcher.searchPlaceholder', {
                defaultValue: 'Search languages...',
              })}
              className={cn(
                'h-9 w-full rounded-md border bg-background pl-8 pr-8 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-1 focus:ring-ring',
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && displayLanguages.length > 0) {
                  e.preventDefault()
                  void switchLocale(displayLanguages[0].code)
                }
                if (e.key === 'Escape' && query) {
                  e.preventDefault()
                  setQuery('')
                }
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Region tabs */}
        {!isSearching && (
          <div className="border-b px-3 py-2">
            <div className="flex flex-wrap gap-1">
              {REGION_TABS.filter(
                (tab) => tab.id === 'all' || (regionCounts[tab.id] ?? 0) > 0,
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveRegion(tab.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    activeRegion === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Language list */}
        <div className="max-h-[340px] overflow-y-auto py-1">
          {displayLanguages.length > 0 ? (
            displayLanguages.map((language) => {
              const isActive = language.code === currentLocale
              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => void switchLocale(language.code)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                    'hover:bg-accent/60',
                    isActive && 'bg-primary/5',
                  )}
                >
                  {language.countryCode ? (
                    <span className="inline-flex w-5 shrink-0 justify-center text-base leading-none">
                      {countryCodeToEmoji(language.countryCode)}
                    </span>
                  ) : (
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{language.nativeName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {language.name}
                    </span>
                  </span>
                  {isActive ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">
                      {language.code}
                    </span>
                  )}
                </button>
              )
            })
          ) : (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Globe className="mb-2 h-6 w-6 opacity-30" />
              <p className="text-sm">{t('languageSwitcher.noResults')}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
