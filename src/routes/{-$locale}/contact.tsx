import { createFileRoute, useLocation } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react'
import { submitContactForm } from '@/services/contact.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { designSystem } from '@/lib/design-system'
import { PageContainer } from '@/components/layout/PageContainer'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLocaleFromPath } from '@/lib/i18n-utils'
import {
  CompanyPageLayout,
  CompanyPagePanel,
  getCompanySectionLabels,
  type CompanySectionId,
} from '@/components/company/CompanyPageLayout'
import { featureFlags } from '@/lib/feature-flags'
import { useChat } from '@/contexts/ChatContext'

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

const TURNSTILE_SITE_KEY = '0x4AAAAAACZzTuT3G2MhmZ8O'

const CONTACT_SECTION_IDS = [
  'overview',
  'channels',
  'contact',
] as const satisfies ReadonlyArray<CompanySectionId>
const CONTACT_EMAIL = 'info@starthn.ba'
const BOOKING_URL = ''

export const Route = createFileRoute('/{-$locale}/contact')({
  head: () => ({
    meta: [
      { title: 'Contact — StartHN' },
      {
        name: 'description',
        content:
          'Get in touch with Start HN for enterprise software, AI solutions, and cloud architecture.',
      },
      { property: 'og:title', content: 'Contact — Start HN' },
      {
        property: 'og:description',
        content:
          'Get in touch with Start HN for enterprise software, AI solutions, and cloud architecture.',
      },
    ],
    scripts: [
      {
        src: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
        async: true,
        defer: true,
      },
    ],
  }),
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
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const sectionLabels = getCompanySectionLabels(currentLocale, CONTACT_SECTION_IDS)

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
      id: 'location',
      icon: MapPin,
      title: t('contact.methods.location.title'),
      description: t('contact.methods.location.description'),
      value: t('contact.methods.location.value'),
      action: 'https://maps.google.com/?q=Sarajevo,Bosnia+and+Herzegovina',
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
  const reasons = (typeof reasonsRaw === 'string' ? [] : reasonsRaw) as string[]

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
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
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

  useEffect(() => {
    if (window.turnstile) {
      renderTurnstile()
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval)
          renderTurnstile()
        }
      }, 200)
      return () => clearInterval(interval)
    }
  }, [renderTurnstile])

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
    <CompanyPageLayout labels={sectionLabels} ids={CONTACT_SECTION_IDS}>
      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-end">
            <div className="min-w-0 max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <MessageSquare className="h-4 w-4" />
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
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <a href="#contact">
                    {t('contact.form.submit')}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href={`mailto:${CONTACT_EMAIL}`}>
                    {t('contact.methods.email.title')}
                  </a>
                </Button>
              </div>
            </div>

            <div className="min-w-0 divide-y divide-border border-y border-border">
              {contactMethods.map((method) => {
                const Icon = method.icon
                return (
                  <div key={method.id} className="flex items-start gap-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {method.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {method.description}
                      </p>
                      {method.action ? (
                        <a
                          href={method.action}
                          target={
                            method.action.startsWith('http')
                              ? '_blank'
                              : undefined
                          }
                          rel={
                            method.action.startsWith('http')
                              ? 'noopener noreferrer'
                              : undefined
                          }
                          className="mt-1 block truncate text-sm font-medium text-primary hover:underline"
                        >
                          {method.value}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {method.value}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>

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
                    <Select
                      value={formData.subject}
                      onValueChange={handleSubjectChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="subject"
                        aria-invalid={Boolean(subjectError)}
                        className={cn(
                          subjectError &&
                            'border-destructive focus:ring-destructive/40',
                        )}
                      >
                        <SelectValue
                          placeholder={t('contact.form.placeholders.subject')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <Button
                  type="submit"
                  className="min-h-11 w-full"
                  disabled={isSubmitDisabled}
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
