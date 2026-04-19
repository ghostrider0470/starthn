import { Link, useLocation } from '@tanstack/react-router'
import { Facebook, Instagram, Linkedin, Mail, Phone, MapPin, Clock, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

const SOCIALS = [
  { name: 'LinkedIn', Icon: Linkedin, href: 'https://www.linkedin.com/company/start-hn' },
  { name: 'Instagram', Icon: Instagram, href: 'https://www.instagram.com/starthn.ba' },
  { name: 'Facebook', Icon: Facebook, href: 'https://www.facebook.com/starthn.ba' },
] as const

const SERVICE_KEYS = ['bookkeeping', 'tax', 'vcfo', 'reporting', 'consulting', 'education'] as const
const COMPANY_KEYS = ['about', 'team', 'blog', 'careers', 'contact'] as const
const LEGAL_KEYS = ['privacyPolicy', 'termsOfService', 'cookiePolicy'] as const

const companyHrefs: Record<(typeof COMPANY_KEYS)[number], string> = {
  about: '/about',
  team: '/team',
  blog: '/blog',
  careers: '/careers',
  contact: '/contact',
}

const legalHrefs: Record<(typeof LEGAL_KEYS)[number], string> = {
  privacyPolicy: '/privacy',
  termsOfService: '/terms',
  cookiePolicy: '/privacy#cookies',
}

export function Footer() {
  const { t } = useTranslation()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  const withLocale = (path: string) => {
    const [basePath, hash] = path.split('#')
    const base = withLocalePath(basePath || '/', currentLocale)
    return hash ? `${base}#${hash}` : base
  }

  const year = new Date().getFullYear()

  return (
    <footer
      className={cn('relative z-40 border-t border-border/60 bg-background')}
      itemScope
      itemType="https://schema.org/AccountingService"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />

      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl py-16 md:py-20')}>
        <div className="grid grid-cols-1 gap-10 border-b border-border/60 pb-14 md:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:pb-16">
          {/* Brand + description + socials */}
          <div className="lg:col-span-4">
            <Link to={withLocale('/')} className="inline-flex items-center">
              <img
                src="/logo-128.webp"
                alt="Start HN"
                className="h-12 w-auto"
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                itemProp="logo"
              />
              <span className="sr-only" itemProp="name">
                Start HN
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground" itemProp="description">
              {t('footer.description')}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SOCIALS.map(({ name, Icon, href }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={name}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
              {t('footer.services')}
            </h3>
            <ul className="space-y-2">
              {SERVICE_KEYS.map((key) => (
                <li key={key}>
                  <Link
                    to={withLocale('/services')}
                    className="block text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {t(`footer.servicesList.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
              {t('footer.company')}
            </h3>
            <ul className="space-y-2">
              {COMPANY_KEYS.map((key) => (
                <li key={key}>
                  <Link
                    to={withLocale(companyHrefs[key])}
                    className="block text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {t(`footer.companyLinks.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact info */}
          <div className="lg:col-span-4">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
              {t('footer.contact')}
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a
                  href={`mailto:${t('footer.contactInfo.email')}`}
                  className="group flex items-start gap-3 transition-colors hover:text-primary"
                  itemProp="email"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t('footer.contactInfo.email')}</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${t('footer.contactInfo.phone').replace(/\s/g, '')}`}
                  className="group flex items-start gap-3 transition-colors hover:text-primary"
                  itemProp="telephone"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="tabular-nums">{t('footer.contactInfo.phone')}</span>
                </a>
              </li>
              <li
                className="flex items-start gap-3"
                itemProp="address"
                itemScope
                itemType="https://schema.org/PostalAddress"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <address className="not-italic">
                  <span itemProp="streetAddress">{t('footer.contactInfo.street')}</span>
                  <br />
                  <span itemProp="addressLocality">{t('footer.contactInfo.locality')}</span>
                  <span className="mx-1 text-muted-foreground/50">·</span>
                  <span itemProp="addressRegion">{t('footer.contactInfo.region')}</span>
                  <br />
                  <span itemProp="addressCountry" content="BA">
                    {t('footer.contactInfo.country')}
                  </span>
                </address>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span itemProp="openingHours" content="Mo-Fr 08:00-16:00">
                    {t('footer.contactInfo.hours')}
                  </span>
                  <br />
                  <span className="text-muted-foreground/70">{t('footer.contactInfo.holidays')}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA strip */}
        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-xl border border-border/60 bg-muted/30 p-6 md:flex-row md:items-center md:p-8">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground md:text-xl">
              {t('footer.ctaTitle')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('footer.ctaDescription')}</p>
          </div>
          <Link
            to={withLocale('/contact')}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-95 group"
          >
            {t('footer.ctaButton')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <Separator className="my-8 bg-border/60" />

        <div className="flex flex-col items-start justify-between gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p suppressHydrationWarning>{t('footer.copyright', { year })}</p>
          <nav aria-label={t('footer.legal')}>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {LEGAL_KEYS.map((key) => (
                <li key={key}>
                  <Link to={withLocale(legalHrefs[key])} className="transition-colors hover:text-primary">
                    {t(`footer.legalLinks.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
