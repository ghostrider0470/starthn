import { Link, useLocation } from '@tanstack/react-router'
import { Github, Linkedin, Mail, Twitter, Youtube } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRef, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import blogService from '@/services/blog.service'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { featureFlags } from '@/lib/feature-flags'

const socialLinks = [
  { name: 'GitHub', icon: Github, href: 'https://github.com' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com' },
  { name: 'YouTube', icon: Youtube, href: 'https://youtube.com' },
]

export function Footer() {
  const { t } = useTranslation()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  const withLocale = (path: string) => {
    if (path.startsWith('#')) {
      return `${withLocalePath('/', currentLocale)}${path}`
    }
    const [basePath, hash] = path.split('#')
    if (hash) {
      return `${withLocalePath(basePath || '/', currentLocale)}#${hash}`
    }
    return withLocalePath(path, currentLocale)
  }

  // Defer featured blog fetch until footer scrolls into view
  const footerRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = footerRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const { data: featuredData } = useQuery({
    queryKey: ['blog', 'featured-footer'],
    queryFn: () => blogService.fetchBlogPostsPaged(undefined, { page: 1, pageSize: 1 }),
    staleTime: 30 * 60 * 1000,
    retry: 1,
    enabled: visible,
  })
  const featuredPost = featuredData?.items?.[0]

  const footerLinks = {
    ...(featureFlags.technicalResources
      ? {
          [t('footer.features')]: [
            { name: t('footer.innovationLabOverview'), href: '/innovation-lab' },
            { name: t('footer.appliedAiSystems'), href: '/innovation-lab/ai-systems' },
            { name: t('footer.nlpDemo'), href: '/innovation-lab/nlp' },
            {
              name: t('footer.geneticAlgorithmSimulation'),
              href: '/innovation-lab/genetic-algorithm',
            },
          ],
        }
      : {}),
    [t('footer.resources')]: [
      { name: t('footer.blog'), href: '/blog' },
      ...(featuredPost
        ? [{
            name: t('footer.featuredBlogPost'),
            href: `/blog/${featuredPost.slug}`,
          }]
        : []),
      ...(featureFlags.caseStudies
        ? [
            { name: t('footer.caseStudies'), href: '/case-studies' },
            {
              name: t('footer.featuredCaseStudy'),
              href: '/case-studies/realtime-ledger-modernization',
            },
          ]
        : []),
    ],
    [t('footer.company')]: [
      { name: t('footer.about'), href: '/about' },
      { name: t('footer.contact'), href: '/contact' },
      { name: t('footer.partners'), href: '/#partners' },
      { name: t('footer.careers'), href: '/careers' },
    ],
    [t('footer.legal')]: [
      { name: t('footer.privacyPolicy'), href: '/privacy' },
      { name: t('footer.termsOfService'), href: '/terms' },
      { name: t('footer.cookiePolicy'), href: '/privacy#cookies' },
      { name: t('footer.license'), href: '/terms#license' },
    ],
  }

  return (
    <footer ref={footerRef} className={cn('relative z-40 mt-32 border-t border-primary/20 bg-background')}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div className="container mx-auto max-w-7xl px-4 py-14 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="col-span-full lg:col-span-5">
            <Link to={withLocale('/')} className="inline-flex items-center rounded-lg">
              <img
                src="/logo-128.webp"
                alt="Start HN"
                className="h-14 w-auto"
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
              />
            </Link>

            <p
              className={cn(
                'mt-5 max-w-md leading-relaxed',
                designSystem.typography.body.small,
                designSystem.typography.muted
              )}
            >
              {t('footer.description')}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background transition-all',
                      'hover:border-primary/50 hover:bg-primary/10 hover:text-primary',
                      designSystem.effects.focusRing
                    )}
                    aria-label={social.name}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>

          <div className="col-span-full grid gap-8 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-4">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3
                  className={cn(
                    'mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80',
                    designSystem.typography.body.small
                  )}
                >
                  {category}
                </h3>
                <ul className="space-y-1.5">
                  {links.map((link) => (
                    <li key={link.name}>
                      {link.href.includes('#') ? (
                        <a
                          href={withLocale(link.href)}
                          className={cn(
                            'mx-[-0.5rem] block rounded-md px-2 py-1.5 transition-colors',
                            'hover:bg-primary/10 hover:text-primary',
                            designSystem.typography.body.small,
                            designSystem.typography.muted,
                            designSystem.effects.focusRing
                          )}
                        >
                          {link.name}
                        </a>
                      ) : (
                        <Link
                          to={withLocale(link.href)}
                          className={cn(
                            'mx-[-0.5rem] block rounded-md px-2 py-1.5 transition-colors',
                            'hover:bg-primary/10 hover:text-primary',
                            designSystem.typography.body.small,
                            designSystem.typography.muted,
                            designSystem.effects.focusRing
                          )}
                        >
                          {link.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Separator className={cn('my-8 bg-primary/20')} />

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p suppressHydrationWarning className={cn(designSystem.typography.body.small, designSystem.typography.muted)}>
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <Link
            to={withLocale('/contact')}
            className={cn(
              'inline-flex min-h-11 items-center rounded-md border border-border px-4 py-2 transition-all',
              'hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
              designSystem.typography.body.small,
              designSystem.typography.muted,
              designSystem.effects.focusRing
            )}
            aria-label={t('footer.subscribe')}
          >
            <Mail className="mr-2 inline h-4 w-4" />
            {t('footer.subscribe')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
