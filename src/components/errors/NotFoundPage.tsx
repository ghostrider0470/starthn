import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight, BookOpenText, BriefcaseBusiness, Home, Layers3 } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { Button } from '@/components/ui/button'
import { StandardCard } from '@/components/ui/standard-card'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export function NotFoundPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const locale = getLocaleFromPath(location.pathname)

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
              <span className="block text-6xl font-bold text-primary">404</span>
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

            <p
              className={cn(
                designSystem.typography.body.xs,
                'text-muted-foreground/90',
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
