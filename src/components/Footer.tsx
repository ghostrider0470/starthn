import { Link, useLocation } from '@tanstack/react-router'
import {
  ArrowRight,
  Clock,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { SERVICE_ROUTES } from '@/lib/service-routes'
import { openCookieSettings } from '@/lib/consent'
import {
  BRAND,
  CONTACT_EMAIL,
  FACEBOOK_PROFILE_URL,
  INSTAGRAM_URL,
  LOCALITY,
  OWNER_LINKEDIN_URL,
  PHONE_INTL,
  PHONE_TEL,
  POSTAL_CODE,
  STREET,
} from '@/lib/business'

const SOCIALS = [
  {
    name: 'LinkedIn',
    Icon: Linkedin,
    href: OWNER_LINKEDIN_URL,
  },
  {
    name: 'Instagram',
    Icon: Instagram,
    href: INSTAGRAM_URL,
  },
  {
    name: 'Facebook',
    Icon: Facebook,
    href: FACEBOOK_PROFILE_URL,
  },
] as const

// Footer column headings are visual labels, not document outline headings.
const COLUMN_LABEL_CLASS =
  'mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80'

const SERVICE_KEYS = [
  'bookkeeping',
  'tax',
  'vcfo',
  'consulting',
  'reporting',
  'education',
] as const
const COMPANY_KEYS = [
  'about',
  'missionVision',
  'certificates',
  'blog',
  'careers',
  'contact',
] as const
const LEGAL_KEYS = ['privacyPolicy', 'termsOfService', 'cookiePolicy'] as const

const serviceHrefs: Record<(typeof SERVICE_KEYS)[number], string> = {
  bookkeeping: SERVICE_ROUTES.bookkeeping,
  tax: SERVICE_ROUTES.taxConsulting,
  vcfo: SERVICE_ROUTES.virtualCfo,
  consulting: SERVICE_ROUTES.businessConsulting,
  reporting: SERVICE_ROUTES.financialReporting,
  education: SERVICE_ROUTES.education,
}

const companyHrefs: Record<(typeof COMPANY_KEYS)[number], string> = {
  about: '/about',
  missionVision: '/mission-vision',
  certificates: '/certificates',
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
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />

      <div
        className={cn(
          designSystem.spacing.page.container,
          'max-w-6xl py-16 md:py-20',
        )}
      >
        <div className="grid grid-cols-1 gap-10 border-b border-border/60 pb-14 md:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:pb-16">
          {/* Brand + description + socials */}
          <div className="lg:col-span-4">
            <Link to={withLocale('/')} className="inline-flex items-center">
              <img
                src="/logo-128.webp"
                alt={BRAND}
                className="h-12 w-auto"
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
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
            <p className={COLUMN_LABEL_CLASS}>{t('footer.services')}</p>
            <ul className="space-y-2">
              {SERVICE_KEYS.map((key) => (
                <li key={key}>
                  <Link
                    to={withLocale(serviceHrefs[key])}
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
            <p className={COLUMN_LABEL_CLASS}>{t('footer.company')}</p>
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
            <p className={COLUMN_LABEL_CLASS}>{t('footer.contact')}</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="group flex items-start gap-3 transition-colors hover:text-primary"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{CONTACT_EMAIL}</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${PHONE_TEL}`}
                  className="group flex items-start gap-3 transition-colors hover:text-primary"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="tabular-nums">{PHONE_INTL}</span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <address className="not-italic">
                  {STREET}
                  <br />
                  {`${POSTAL_CODE} ${LOCALITY}`}
                  <span className="mx-1 text-muted-foreground/50">·</span>
                  {t('footer.contactInfo.region')}
                  <br />
                  {t('footer.contactInfo.country')}
                </address>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  {t('footer.contactInfo.hours')}
                  <br />
                  <span className="text-muted-foreground">
                    {t('footer.contactInfo.holidays')}
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA strip */}
        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-xl border border-border/60 bg-muted/30 p-6 md:flex-row md:items-center md:p-8">
          <div>
            <p className="font-heading text-lg font-semibold text-foreground md:text-xl">
              {t('footer.ctaTitle')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('footer.ctaDescription')}
            </p>
          </div>
          <Link
            to={withLocale('/contact')}
            className="group inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-95"
          >
            {t('footer.ctaButton')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <Separator className="my-8 bg-border/60" />

        <div className="flex flex-col items-start justify-between gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <p suppressHydrationWarning>{t('footer.copyright', { year })}</p>
            <p className="flex items-center gap-2">
              {t('footer.developedBy')}{' '}
              <a
                href="https://horizon-tech.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
              >
                <img
                  src="/clients/horizon.webp"
                  alt="Horizon Tech d.o.o."
                  width={20}
                  height={20}
                  className="h-5 w-auto"
                />
                <span className="hover:text-primary transition-colors">Horizon Tech d.o.o.</span>
              </a>
            </p>
          </div>
          <nav aria-label={t('footer.legal')}>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {LEGAL_KEYS.map((key) => (
                <li key={key}>
                  <Link
                    to={withLocale(legalHrefs[key])}
                    className="transition-colors hover:text-primary"
                  >
                    {t(`footer.legalLinks.${key}`)}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="transition-colors hover:text-primary"
                >
                  {t('common:consent.settings', {
                    defaultValue: 'Cookie settings',
                  })}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
