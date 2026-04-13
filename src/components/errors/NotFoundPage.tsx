import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight, BookOpenText, BriefcaseBusiness, Home, Layers3 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { Button } from '@/components/ui/button'
import { StandardCard } from '@/components/ui/standard-card'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const GLITCH_FRAMES = ['404', '4O4', '4#4', '404']

export function NotFoundPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()
  const locale = getLocaleFromPath(location.pathname)

  const terminalLines = useMemo(
    () => [
      t('error.notFound.terminal.line1'),
      t('error.notFound.terminal.line2'),
      t('error.notFound.terminal.line3'),
      t('error.notFound.terminal.line4'),
    ],
    [t],
  )

  const [visibleLines, setVisibleLines] = useState(
    prefersReducedMotion ? terminalLines.length : 1,
  )
  const [glitchFrame, setGlitchFrame] = useState(0)

  // Tell search engines not to index 404 pages
  useEffect(() => {
    let meta = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex,nofollow')

    return () => {
      meta?.setAttribute('content', 'index,follow')
    }
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleLines(terminalLines.length)
      return
    }

    setVisibleLines(1)
    const timer = window.setInterval(() => {
      setVisibleLines((current) => {
        if (current >= terminalLines.length) {
          window.clearInterval(timer)
          return current
        }

        return current + 1
      })
    }, 320)

    return () => window.clearInterval(timer)
  }, [prefersReducedMotion, terminalLines])

  useEffect(() => {
    if (prefersReducedMotion) {
      return
    }

    const timer = window.setInterval(() => {
      setGlitchFrame((current) => (current + 1) % GLITCH_FRAMES.length)
    }, 180)

    return () => window.clearInterval(timer)
  }, [prefersReducedMotion])

  const shortcuts = [
    {
      key: 'home' as const,
      to: withLocalePath('/', locale),
      icon: Home,
      primary: true,
    },
    {
      key: 'services' as const,
      to: withLocalePath('/services/enterprise-software-development', locale),
      icon: BriefcaseBusiness,
      primary: false,
    },
    {
      key: 'blog' as const,
      to: withLocalePath('/blog', locale),
      icon: BookOpenText,
      primary: false,
    },
    {
      key: 'caseStudies' as const,
      to: withLocalePath('/case-studies', locale),
      icon: Layers3,
      primary: false,
    },
  ]

  return (
    <>
    <Navbar />
    <div className="pt-16">
    <PageContainer maxWidth="2xl" spacing="md" className="relative">
      <SectionContainer spacing="xl" align="center">
        <StandardCard
          variant="gradient"
          className="relative overflow-hidden border-primary/30 bg-background/80 backdrop-blur"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgb(255 107 53 / 0.16), rgb(168 85 247 / 0.14)), repeating-linear-gradient(0deg, rgb(255 255 255 / 0.05) 0px, rgb(255 255 255 / 0.05) 1px, transparent 2px, transparent 4px)',
            }}
          />

          <div className="relative z-10 space-y-6 text-center">
            <p
              className={cn(
                designSystem.typography.display.eyebrow,
                'tracking-[0.18em] text-primary',
              )}
            >
              {t('error.notFound.badge')}
            </p>

            <h1
              className={cn(
                designSystem.typography.display.pageTitle,
                'space-y-2 text-balance',
              )}
            >
              <span className="block font-mono tracking-[0.35em] text-primary">
                {GLITCH_FRAMES[glitchFrame]}
              </span>
              <span className="block">{t('error.notFound.title')}</span>
            </h1>

            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'mx-auto max-w-2xl',
              )}
            >
              {t('error.notFound.description')}
            </p>

            <StandardCard
              variant="accent"
              padding="compact"
              className="mx-auto max-w-3xl border-primary/30 bg-background/90 text-left"
            >
              <div className="font-mono text-sm">
                <p className="mb-3 text-primary">
                  {t('error.notFound.terminal.prompt')}
                </p>
                <div className="space-y-1 text-muted-foreground">
                  {terminalLines.slice(0, visibleLines).map((line, index) => (
                    <p
                      key={line}
                      className={cn(
                        'transition-opacity duration-300',
                        index === visibleLines - 1 && !prefersReducedMotion && 'animate-pulse',
                      )}
                    >
                      {line}
                    </p>
                  ))}
                  {!prefersReducedMotion && visibleLines < terminalLines.length && (
                    <p className="animate-pulse text-primary">█</p>
                  )}
                </div>
              </div>
            </StandardCard>

            <p
              className={cn(
                designSystem.typography.body.xs,
                'font-mono text-muted-foreground/90',
              )}
            >
              {t('error.notFound.requestedPath')}: {location.pathname}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon

                return (
                  <Button
                    key={shortcut.key}
                    asChild
                    variant={shortcut.primary ? 'default' : 'outline'}
                    className="justify-between"
                  >
                    <Link to={shortcut.to}>
                      <span className="inline-flex items-center gap-2">
                        <Icon className={designSystem.icons.size.sm} />
                        {t(`error.notFound.links.${shortcut.key}`)}
                      </span>
                      <ArrowRight className={designSystem.icons.size.sm} />
                    </Link>
                  </Button>
                )
              })}
            </div>
          </div>
        </StandardCard>
      </SectionContainer>
    </PageContainer>
    </div>
    <Footer />
    </>
  )
}
