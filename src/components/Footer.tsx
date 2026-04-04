import { Link, useLocation } from '@tanstack/react-router'
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: 'https://www.facebook.com/p/START-HN-Ra%C4%8Dunovodstvena-agencija-100086643588042/' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/in/selma-had%C5%BEi%C4%87-150907323/' },
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/racunovodstvo_starthn/' },
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

  const footerLinks = {
    [t('footer.services')]: [
      { name: t('footer.accounting'), href: '/usluge#racunovodstvo' },
      { name: t('footer.taxAdvisory'), href: '/usluge#porezi' },
      { name: t('footer.virtualCfo'), href: '/usluge#virtualni-cfo' },
    ],
    [t('footer.pages')]: [
      { name: t('footer.about'), href: '/about' },
      { name: t('footer.blog'), href: '/blog' },
      { name: t('footer.gallery'), href: '/galerija' },
      { name: t('footer.faqPage'), href: '/faq' },
      { name: t('footer.contact'), href: '/contact' },
    ],
    [t('footer.legal')]: [
      { name: t('footer.privacyPolicy'), href: '/privacy' },
      { name: t('footer.termsOfService'), href: '/terms' },
    ],
  }

  return (
    <footer className={cn('relative z-40 mt-32 border-t border-primary/20 bg-background')}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div className="container mx-auto max-w-7xl px-4 py-14 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="col-span-full lg:col-span-5">
            <Link to={withLocale('/')} className="inline-flex items-center rounded-lg">
              <img
                src="/clean-square.png"
                alt="Start HN"
                className="h-14 w-auto"
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

            {/* Contact Info */}
            <div className="mt-5 space-y-2">
              <div className={cn('flex items-center gap-2', designSystem.typography.body.small, designSystem.typography.muted)}>
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span>Ibrahima Ljubovića 47, Ilidža, Sarajevo</span>
              </div>
              <div className={cn('flex items-center gap-2', designSystem.typography.body.small, designSystem.typography.muted)}>
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href="tel:+38761135377" className="hover:text-primary transition-colors">+387 61/135-377</a>
              </div>
              <div className={cn('flex items-center gap-2', designSystem.typography.body.small, designSystem.typography.muted)}>
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:info@starthn.ba" className="hover:text-primary transition-colors">info@starthn.ba</a>
              </div>
              <div className={cn('flex items-center gap-2', designSystem.typography.body.small, designSystem.typography.muted)}>
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                <span>Pon - Pet: 8:00 - 16:00</span>
              </div>
            </div>

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

          <div className="col-span-full grid gap-8 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3">
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
          <p className={cn(designSystem.typography.body.small, designSystem.typography.muted)}>
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
            aria-label={t('footer.contactUs')}
          >
            <Mail className="mr-2 inline h-4 w-4" />
            {t('footer.contactUs')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
