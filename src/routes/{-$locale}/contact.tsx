import { createFileRoute, useLocation } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Send,
  Sparkles,
  Star,
} from 'lucide-react'
import type { CompanySectionId } from '@/components/company/CompanyPageLayout'
import { loadTurnstileScript } from '@/lib/turnstile'
import { submitContactForm } from '@/services/contact.service'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { designSystem } from '@/lib/design-system'
import { PageContainer } from '@/components/layout/PageContainer'
import { cn } from '@/lib/utils'
import { getLocaleFromPath } from '@/lib/i18n-utils'
import {
  CompanyPageLayout,
  CompanyPagePanel,
  getCompanySectionLabels,
} from '@/components/company/CompanyPageLayout'
import { featureFlags } from '@/lib/feature-flags'
import { useChat } from '@/contexts/ChatContext'
import { localizedPageHead } from '@/lib/seo-meta'
import {
  CONTACT_EMAIL,
  GBP_DIRECTIONS_URL,
  GBP_WRITE_REVIEW_URL,
  GOOGLE_BUSINESS_PROFILE_URL,
  LOCALITY,
  POSTAL_CODE,
  STREET,
} from '@/lib/business'
import {
  CallLink,
  GoogleRatingLink,
  useCallLabels,
  useLegalEntityLine,
  useOwnLocaleText,
} from '@/components/ContactActions'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: Record<string, unknown>,
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const TURNSTILE_SITE_KEY = '0x4AAAAAADU9_4ZjC1jF2VSK'

const CONTACT_SECTION_IDS = [
  'overview',
  'channels',
  'contact',
] as const satisfies ReadonlyArray<CompanySectionId>
/** Scroller id of the "Kako do nas" panel (second, after the hero). */
const LOCATION_SECTION_ID = 'location'
const EXTERNAL_LINK_PROPS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const
/**
 * A link whose ::after covers its nearest positioned ancestor, so a whole
 * card or button is one tap target while the link text stays short.
 */
const STRETCHED_LINK_CLASS =
  "outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
const BOOKING_URL = ''

export const Route = createFileRoute('/{-$locale}/contact')({
  // Turnstile is not in the head: ContactPage loads it when the form comes
  // near the viewport or gets focus (loadTurnstileScript).
  head: ({ params }) => localizedPageHead('contact', params.locale),
  component: ContactPage,
})

type ContactFormData = {
  name: string
  email: string
  company: string
  subject: string
  message: string
}

type ContactRequiredField = 'name' | 'email' | 'subject' | 'message'
type ContactValidationErrors = Partial<Record<ContactRequiredField, string>>

type ContactTranslator = (
  key: string,
  options?: Record<string, unknown>,
) => string

const REQUIRED_CONTACT_FIELDS: Array<ContactRequiredField> = [
  'name',
  'email',
  'subject',
  'message',
]
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_MESSAGE_LENGTH = 20
const initialTouchedState: Record<ContactRequiredField, boolean> = {
  name: false,
  email: false,
  subject: false,
  message: false,
}

const isRequiredContactField = (
  field: string,
): field is ContactRequiredField => {
  return REQUIRED_CONTACT_FIELDS.includes(field as ContactRequiredField)
}

function getContactFormValidationErrors(
  formData: ContactFormData,
  t: ContactTranslator,
): ContactValidationErrors {
  const errors: ContactValidationErrors = {}
  const trimmedName = formData.name.trim()
  const trimmedEmail = formData.email.trim()
  const trimmedSubject = formData.subject.trim()
  const trimmedMessage = formData.message.trim()

  if (!trimmedName) {
    errors.name = t('contact.form.validation.required.name')
  }

  if (!trimmedEmail) {
    errors.email = t('contact.form.validation.required.email')
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = t('contact.form.validation.email')
  }

  if (!trimmedSubject) {
    errors.subject = t('contact.form.validation.required.subject')
  }

  if (!trimmedMessage) {
    errors.message = t('contact.form.validation.required.message')
  } else if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
    errors.message = t('contact.form.validation.messageMinLength', {
      count: MIN_MESSAGE_LENGTH,
    })
  }

  return errors
}

function ContactPage() {
  const { t } = useTranslation('pages')
  const { t: tCommon } = useTranslation('common')
  const text = useOwnLocaleText('pages')
  const commonText = useOwnLocaleText('common')
  const callLabels = useCallLabels()
  const legalEntityLine = useLegalEntityLine()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const baseSectionLabels = getCompanySectionLabels(
    currentLocale,
    CONTACT_SECTION_IDS,
  )
  // The location panel needs its copy in this locale (never a fallback
  // language); until a translator adds it, the page keeps its three panels.
  const locationTitle = text('contact.location.title', '')
  const hasLocation = locationTitle !== ''
  const sectionIds: Array<string> = hasLocation
    ? [CONTACT_SECTION_IDS[0], LOCATION_SECTION_ID, ...CONTACT_SECTION_IDS.slice(1)]
    : [...CONTACT_SECTION_IDS]
  const sectionLabels = hasLocation
    ? [
        baseSectionLabels[0],
        text('contact.location.overline', ''),
        ...baseSectionLabels.slice(1),
      ]
    : baseSectionLabels
  // The number as this page writes it (the contact card shows the same).
  const phoneValue = t('contact.methods.phone.value')
  const verifyingText = text('contact.form.verifying', '')
  const verifyingHint = text('contact.form.verifyingHint', '')

  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  })
  const [touchedFields, setTouchedFields] = useState<
    Record<ContactRequiredField, boolean>
  >(() => ({ ...initialTouchedState }))
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(
    null,
  )
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  // Turnstile (~120 KB) loads once the form is near the viewport or focused.
  // 0 = not requested yet; each later value is one load attempt.
  const [turnstileAttempt, setTurnstileAttempt] = useState(0)
  const turnstileFailedRef = useRef(false)
  const requestTurnstile = useCallback(() => {
    // First request, or a retry after a failed load (never while loading).
    setTurnstileAttempt((attempt) =>
      attempt === 0 || turnstileFailedRef.current ? attempt + 1 : attempt,
    )
  }, [])

  const contactMethods = [
    {
      id: 'email',
      icon: Mail,
      title: t('contact.methods.email.title'),
      description: t('contact.methods.email.description'),
      value: t('contact.methods.email.value'),
      action: `mailto:${CONTACT_EMAIL}`,
    },
    {
      id: 'phone',
      icon: Phone,
      title: t('contact.methods.phone.title'),
      description: t('contact.methods.phone.description'),
      value: t('contact.methods.phone.value'),
      // Rendered as a CallLink (consent-gated GA4 tel_click).
      action: 'tel',
    },
    {
      id: 'location',
      icon: MapPin,
      title: t('contact.methods.location.title'),
      description: t('contact.methods.location.description'),
      value: t('contact.methods.location.value'),
      // The Google Business Profile (map pin, directions and reviews).
      action: GOOGLE_BUSINESS_PROFILE_URL,
    },
    {
      id: 'hours',
      icon: CalendarClock,
      title: t('contact.methods.hours.title'),
      description: t('contact.methods.hours.description'),
      value: t('contact.methods.hours.value'),
      action: null,
    },
    {
      id: 'response',
      icon: Clock,
      title: t('contact.methods.response.title'),
      description: t('contact.methods.response.description'),
      value: t('contact.methods.response.value'),
      action: null,
    },
  ]

  const departments = [
    { value: 'project', label: t('contact.departments.project.label') },
    { value: 'support', label: t('contact.departments.support.label') },
    {
      value: 'partnerships',
      label: t('contact.departments.partnerships.label'),
    },
    { value: 'careers', label: t('contact.departments.careers.label') },
    { value: 'general', label: t('contact.departments.general.label') },
  ]

  const reasonsRaw = t('contact.reasons', { returnObjects: true })
  const reasons = (typeof reasonsRaw === 'string' ? [] : reasonsRaw) as Array<string>

  const validationErrors = useMemo(
    () => getContactFormValidationErrors(formData, t),
    [formData, t],
  )
  const isFormValid = Object.keys(validationErrors).length === 0
  const errorTextClassName = cn(
    designSystem.typography.body.xs,
    'text-destructive',
  )

  const getFieldError = useCallback(
    (field: ContactRequiredField): string | undefined => {
      if (!touchedFields[field] && !hasAttemptedSubmit) return undefined
      return validationErrors[field]
    },
    [hasAttemptedSubmit, touchedFields, validationErrors],
  )

  const setFieldTouched = useCallback((field: ContactRequiredField) => {
    setTouchedFields((prev) => {
      if (prev[field]) return prev
      return {
        ...prev,
        [field]: true,
      }
    })
  }, [])

  const handleSubjectChange = useCallback(
    (value: string) => {
      setFormData((prev) => ({ ...prev, subject: value }))
      setFieldTouched('subject')
      if (submitStatus) {
        setSubmitStatus(null)
      }
    },
    [setFieldTouched, submitStatus],
  )

  const handleFieldBlur = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const fieldName = e.target.name
    if (isRequiredContactField(fieldName)) {
      setFieldTouched(fieldName)
    }
  }

  const renderTurnstile = useCallback(() => {
    if (!turnstileRef.current || !window.turnstile) return
    if (widgetIdRef.current) window.turnstile.remove(widgetIdRef.current)
    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(null),
      theme: 'auto',
    })
  }, [])

  // Ask for Turnstile when the form's widget slot comes within ~one screen of
  // the viewport (or right away where IntersectionObserver is missing).
  useEffect(() => {
    if (turnstileAttempt > 0) return undefined
    const slot = turnstileRef.current
    if (!slot || typeof IntersectionObserver === 'undefined') {
      requestTurnstile()
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) requestTurnstile()
      },
      { rootMargin: '800px 0px' },
    )
    observer.observe(slot)
    return () => observer.disconnect()
  }, [turnstileAttempt, requestTurnstile])

  useEffect(() => {
    if (turnstileAttempt === 0) return undefined
    let cancelled = false
    turnstileFailedRef.current = false
    loadTurnstileScript().then(
      () => {
        if (!cancelled) renderTurnstile()
      },
      (error: unknown) => {
        // The next focus on the form tries again (no automatic retry loop).
        turnstileFailedRef.current = true
        console.error('[contact] Turnstile failed to load:', error)
      },
    )
    return () => {
      cancelled = true
    }
  }, [turnstileAttempt, renderTurnstile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasAttemptedSubmit(true)
    if (!isFormValid || !turnstileToken) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const result = await submitContactForm({
        name: formData.name.trim(),
        email: formData.email.trim(),
        company: formData.company || undefined,
        subject: formData.subject,
        message: formData.message.trim(),
        turnstileToken,
      })

      if (result.success) {
        setSubmitStatus('success')
        setFormData({
          name: '',
          email: '',
          company: '',
          subject: '',
          message: '',
        })
        setTouchedFields({ ...initialTouchedState })
        setHasAttemptedSubmit(false)
      } else {
        setSubmitStatus('error')
      }
    } catch {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
      setTurnstileToken(null)
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (submitStatus) {
      setSubmitStatus(null)
    }
  }

  const nameError = getFieldError('name')
  const emailError = getFieldError('email')
  const subjectError = getFieldError('subject')
  const messageError = getFieldError('message')
  const isSubmitDisabled = isSubmitting || !turnstileToken || !isFormValid

  const { setIsOpen: setChatWidgetOpen } = useChat()
  const meetingHref =
    BOOKING_URL ||
    `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('contact.booking.title'))}`

  const channels = [
    {
      id: 'meeting' as const,
      icon: Calendar,
      title: t('contact.channels.meeting.title'),
      description: t('contact.channels.meeting.description'),
      actionLabel: t('contact.channels.meeting.action'),
      href: meetingHref,
      external: Boolean(BOOKING_URL),
      accent: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      id: 'form' as const,
      icon: Send,
      title: t('contact.channels.form.title'),
      description: t('contact.channels.form.description'),
      actionLabel: t('contact.channels.form.action'),
      href: '#contact',
      external: false,
      accent: 'text-accent',
      bg: 'bg-accent/10',
    },
    ...(featureFlags.chat ? [{
      id: 'chat' as const,
      icon: Sparkles,
      title: t('contact.channels.chat.title'),
      description: t('contact.channels.chat.description'),
      actionLabel: t('contact.channels.chat.action'),
      accent: 'text-green-500',
      bg: 'bg-green-500/10',
    }] : []),
  ]

  return (
    <CompanyPageLayout labels={sectionLabels} ids={sectionIds}>
      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-start">
            <div className="min-w-0 max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <MessageSquare aria-hidden className="h-4 w-4" />
                {t('contact.badge')}
              </p>
              <h1
                className={cn(
                  designSystem.typography.display.heroCompact,
                  'text-balance text-foreground',
                )}
              >
                {t('contact.hero.title')}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {t('contact.hero.description')}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button size="lg" asChild>
                  <a href="#contact">
                    {t('contact.form.submit')}
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </a>
                </Button>
                {/* "Pozovi 061 221 368": the link carries the number and
                    stretches over the whole button. */}
                <span
                  className={cn(
                    buttonVariants({ size: 'lg', variant: 'outline' }),
                    'relative',
                  )}
                >
                  <Phone aria-hidden className="h-4 w-4" />
                  <span aria-hidden>{callLabels.call}</span>
                  <CallLink
                    placement="contact_hero"
                    aria-label={`${callLabels.call} ${phoneValue}`}
                    className={cn('tabular-nums', STRETCHED_LINK_CLASS)}
                  >
                    {phoneValue}
                  </CallLink>
                </span>
                <Button size="lg" variant="outline" asChild>
                  <a href={`mailto:${CONTACT_EMAIL}`}>
                    <Mail aria-hidden className="h-4 w-4" />
                    {t('contact.methods.email.title')}
                  </a>
                </Button>
              </div>
            </div>

            {/* Each contact card with an action is one tap target, at
                least 48px tall: its link (the value) stretches over the
                whole card. */}
            <ul className="min-w-0 divide-y divide-border border-y border-border">
              {contactMethods.map((method) => {
                const Icon = method.icon
                const valueClass = cn(
                  'mt-1 block text-sm font-medium break-words',
                  method.action
                    ? cn('text-primary group-hover:underline', STRETCHED_LINK_CLASS)
                    : 'text-foreground',
                )
                return (
                  <li
                    key={method.id}
                    className={cn(
                      'relative -mx-2 flex min-h-12 items-start gap-4 rounded-lg px-2 py-4',
                      method.action && 'group transition-colors hover:bg-primary/5',
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {method.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {method.description}
                      </p>
                      {method.action === 'tel' ? (
                        <CallLink placement="contact_card" className={valueClass}>
                          {method.value}
                        </CallLink>
                      ) : method.action ? (
                        <a
                          href={method.action}
                          {...(method.action.startsWith('http')
                            ? EXTERNAL_LINK_PROPS
                            : {})}
                          className={valueClass}
                        >
                          {method.value}
                        </a>
                      ) : (
                        <p className={valueClass}>{method.value}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      {hasLocation && (
        <CompanyPagePanel tone="muted">
          <PageContainer maxWidth="xl" spacing="none">
            <section
              aria-labelledby="contact-location-heading"
              data-testid="contact-location"
              className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.62fr)] lg:items-start"
            >
              <div className="min-w-0 max-w-3xl">
                {text('contact.location.overline', '') && (
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {text('contact.location.overline', '')}
                  </p>
                )}
                <h2
                  id="contact-location-heading"
                  className="mt-3 text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl"
                >
                  {locationTitle}
                </h2>
                {text('contact.location.body', '') && (
                  <p className="mt-5 text-base leading-8 text-muted-foreground">
                    {text('contact.location.body', '')}
                  </p>
                )}
                {/* Plain links: no map embed, so nothing from Google loads
                    (and no cookie is set) before the visitor clicks. */}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button size="lg" asChild>
                    <a href={GBP_DIRECTIONS_URL} {...EXTERNAL_LINK_PROPS}>
                      <Navigation aria-hidden className="h-4 w-4" />
                      {commonText('contactActions.directions', 'Google Maps')}
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a
                      href={GOOGLE_BUSINESS_PROFILE_URL}
                      {...EXTERNAL_LINK_PROPS}
                    >
                      <MapPin aria-hidden className="h-4 w-4" />
                      {commonText('contactActions.openInMaps', 'Google Maps')}
                    </a>
                  </Button>
                </div>
              </div>

              <div className="min-w-0 divide-y divide-border rounded-lg border border-border bg-card shadow-sm">
                <div className="p-5">
                  <p className="text-sm font-semibold text-foreground">
                    {commonText(
                      'contactActions.addressLabel',
                      t('contact.methods.location.title'),
                    )}
                  </p>
                  <address className="mt-2 text-sm leading-6 not-italic text-muted-foreground">
                    <a
                      href={GOOGLE_BUSINESS_PROFILE_URL}
                      {...EXTERNAL_LINK_PROPS}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {STREET}, {POSTAL_CODE} {LOCALITY}
                    </a>
                    <br />
                    {tCommon('footer.contactInfo.region')},{' '}
                    {tCommon('footer.contactInfo.country')}
                  </address>
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-semibold text-foreground">
                    {commonText('legalEntity.title', '') ||
                      t('contact.methods.location.title')}
                  </h3>
                  <p
                    data-testid="contact-legal-entity"
                    className="mt-2 text-sm leading-6 text-muted-foreground"
                  >
                    {legalEntityLine}
                  </p>
                </div>
                <div className="p-5">
                  {text('contact.reviews.title', '') && (
                    <h3 className="text-sm font-semibold text-foreground">
                      {text('contact.reviews.title', '')}
                    </h3>
                  )}
                  {text('contact.reviews.description', '') && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {text('contact.reviews.description', '')}
                    </p>
                  )}
                  <GoogleRatingLink className="mt-1" />
                  <Button
                    variant="outline"
                    className="mt-2 w-full"
                    asChild
                  >
                    <a href={GBP_WRITE_REVIEW_URL} {...EXTERNAL_LINK_PROPS}>
                      <Star aria-hidden className="h-4 w-4" />
                      {commonText('contactActions.leaveReview', 'Google')}
                    </a>
                  </Button>
                </div>
              </div>
            </section>
          </PageContainer>
        </CompanyPagePanel>
      )}

      <CompanyPagePanel tone="muted">
        <PageContainer maxWidth="xl" spacing="none">
          <div className="mb-8 grid gap-4 lg:grid-cols-[0.55fr_1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('contact.info.title')}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t('contact.channels.title')}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:ml-auto md:text-right">
              {t('contact.channels.description')}
            </p>
          </div>

          <div
            className={cn(
              'grid min-w-0 gap-4',
              featureFlags.chat
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 md:grid-cols-2',
            )}
          >
            {channels.map((channel) => {
              const Icon = channel.icon
              const tile = (
                <>
                  <div
                    className={cn(
                      'mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg',
                      channel.bg,
                    )}
                  >
                    <Icon className={cn('h-5 w-5', channel.accent)} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {channel.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {channel.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-primary">
                    {channel.actionLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </>
              )

              const className =
                'group flex min-h-[13rem] min-w-0 flex-col rounded-lg border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md'

              if ('href' in channel) {
                return (
                  <a
                    key={channel.id}
                    href={channel.href}
                    target={channel.external ? '_blank' : undefined}
                    rel={channel.external ? 'noopener noreferrer' : undefined}
                    className={className}
                  >
                    {tile}
                  </a>
                )
              }

              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => {
                    setChatWidgetOpen(true)
                  }}
                  className={className}
                >
                  {tile}
                </button>
              )
            })}
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.68fr)_minmax(18rem,0.32fr)] lg:items-start">
            <div
              id="contact-form"
              className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm md:p-6"
            >
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('contact.channels.form.title')}
                </p>
                <h2
                  id="contact-form-heading"
                  className={cn(designSystem.typography.heading.h3, 'mt-2')}
                >
                  {t('contact.form.title')}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {t('contact.channels.form.description')}
                </p>
              </div>

              {submitStatus === 'success' && (
                <Alert className="mb-6 border-primary/20 bg-primary/10 text-foreground">
                  <AlertDescription>{t('contact.form.success')}</AlertDescription>
                </Alert>
              )}
              {submitStatus === 'error' && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{t('contact.form.error')}</AlertDescription>
                </Alert>
              )}

              <form
                aria-labelledby="contact-form-heading"
                onSubmit={handleSubmit}
                onFocus={requestTurnstile}
                className="space-y-5"
              >
                <div
                  className={cn(
                    designSystem.grid.responsive.two,
                    designSystem.spacing.gap.md,
                  )}
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('contact.form.fullName')}</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={handleFieldBlur}
                      aria-invalid={Boolean(nameError)}
                      required
                      placeholder={t('contact.form.placeholders.name')}
                      disabled={isSubmitting}
                      className={cn(
                        nameError &&
                          'border-destructive focus-visible:ring-destructive/40',
                      )}
                    />
                    {nameError && (
                      <p role="alert" className={errorTextClassName}>
                        {nameError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('contact.form.email')}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleFieldBlur}
                      aria-invalid={Boolean(emailError)}
                      required
                      placeholder={t('contact.form.placeholders.email')}
                      disabled={isSubmitting}
                      className={cn(
                        emailError &&
                          'border-destructive focus-visible:ring-destructive/40',
                      )}
                    />
                    {emailError && (
                      <p role="alert" className={errorTextClassName}>
                        {emailError}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className={cn(
                    designSystem.grid.responsive.two,
                    designSystem.spacing.gap.md,
                  )}
                >
                  <div className="space-y-2">
                    <Label htmlFor="company">{t('contact.form.company')}</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      onBlur={handleFieldBlur}
                      placeholder={t('contact.form.placeholders.company')}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">{t('contact.form.subject')}</Label>
                    {/* A native select: the platform picker on phones, and
                        no Radix Select / scroll-lock code in the page's
                        preloads. The empty first option is the placeholder. */}
                    <div className="relative">
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        onBlur={handleFieldBlur}
                        required
                        aria-invalid={Boolean(subjectError)}
                        disabled={isSubmitting}
                        className={cn(
                          'border-input dark:bg-input/30 flex h-11 w-full min-w-0 appearance-none rounded-md border bg-transparent py-2 pe-10 ps-3 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                          '[&>option]:bg-background [&>option]:text-foreground',
                          formData.subject
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        <option value="" disabled>
                          {t('contact.form.placeholders.subject')}
                        </option>
                        {departments.map((dept) => (
                          <option key={dept.value} value={dept.value}>
                            {dept.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        aria-hidden
                        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
                      />
                    </div>
                    {subjectError && (
                      <p role="alert" className={errorTextClassName}>
                        {subjectError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t('contact.form.message')}</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={handleFieldBlur}
                    aria-invalid={Boolean(messageError)}
                    required
                    placeholder={t('contact.form.placeholders.message')}
                    rows={6}
                    disabled={isSubmitting}
                    className={cn(
                      messageError &&
                        'border-destructive focus-visible:ring-destructive/40',
                    )}
                  />
                  {messageError && (
                    <p role="alert" className={errorTextClassName}>
                      {messageError}
                    </p>
                  )}
                </div>

                <div
                  ref={turnstileRef}
                  className="flex justify-center overflow-x-auto"
                />

                {/* While Cloudflare Turnstile verifies, say why "Send" is
                    not active yet (instead of a blank gap). */}
                {!turnstileToken && !isSubmitting && verifyingText && (
                  <div
                    id="contact-turnstile-status"
                    role="status"
                    data-testid="turnstile-status"
                    className="text-center text-sm text-muted-foreground"
                  >
                    <p className="inline-flex items-center gap-2 font-medium">
                      <Loader2
                        aria-hidden
                        className={cn('h-4 w-4', designSystem.animation.loading)}
                      />
                      {verifyingText}
                    </p>
                    {verifyingHint && (
                      <p className="mt-1 text-xs leading-5">{verifyingHint}</p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="min-h-11 w-full"
                  disabled={isSubmitDisabled}
                  aria-describedby={
                    !turnstileToken && verifyingText
                      ? 'contact-turnstile-status'
                      : undefined
                  }
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2
                        className={cn(
                          'mr-2 h-4 w-4',
                          designSystem.animation.loading,
                        )}
                      />
                      {t('contact.form.sending')}
                    </>
                  ) : (
                    <>
                      {t('contact.form.submit')}
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            <div className="min-w-0 divide-y divide-border border-y border-border">
              <div className="py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('contact.reasonsTitle')}
                </p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  {t('contact.custom.title')}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {t('contact.custom.description')}
                </p>
              </div>
              {reasons.map((reason) => (
                <div key={reason} className="flex items-start gap-3 py-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    {reason}
                  </p>
                </div>
              ))}
              <div className="py-5">
                <Button variant="outline" className="w-full" asChild>
                  <a href={`mailto:${CONTACT_EMAIL}`}>
                    {t('contact.custom.cta')}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>
    </CompanyPageLayout>
  )
}
