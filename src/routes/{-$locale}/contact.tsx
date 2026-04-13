import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Clock,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react'
import { submitContactForm } from '@/services/contact.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StandardCard } from '@/components/ui/standard-card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { designSystem } from '@/lib/design-system'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { featureFlags } from '@/lib/feature-flags'
import { useChat } from '@/contexts/ChatContext'
import { ChatPanel } from '@/components/chat/ChatPanel'

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
      action: 'mailto:info@starthn.ba',
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

  const [activeChannel, setActiveChannel] = useState<'form' | 'chat' | null>(null)
  const { setIsOpen: setChatWidgetOpen } = featureFlags.chat ? useChat() : { setIsOpen: () => {} }

  const channels = [
    {
      id: 'meeting' as const,
      icon: Calendar,
      title: t('contact.channels.meeting.title', 'Book a Meeting'),
      description: t('contact.channels.meeting.description', 'Schedule a 30-min call with our team'),
      accent: 'text-primary',
      bg: 'bg-primary/10',
      hoverBorder: 'hover:border-primary/40',
    },
    {
      id: 'form' as const,
      icon: Send,
      title: t('contact.channels.form.title', 'Send a Message'),
      description: t('contact.channels.form.description', 'We respond within 24 hours'),
      accent: 'text-accent',
      bg: 'bg-accent/10',
      hoverBorder: 'hover:border-accent/40',
    },
    ...(featureFlags.chat ? [{
      id: 'chat' as const,
      icon: Sparkles,
      title: t('contact.channels.chat.title', 'Talk to Our AI'),
      description: t('contact.channels.chat.description', 'Get instant answers about our services'),
      accent: 'text-green-500',
      bg: 'bg-green-500/10',
      hoverBorder: 'hover:border-green-500/40',
    }] : []),
  ]

  return (
    <div className={cn('min-h-screen', designSystem.effects.gradient.subtle)}>
      {/* Hero */}
      <PageContainer>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <Badge className="mb-4" variant="secondary">
            <MessageSquare className="mr-2 h-3 w-3" />
            {t('contact.badge')}
          </Badge>
          <h1
            className={cn(
              designSystem.typography.heading.h1,
              'mb-6 sm:text-5xl',
            )}
          >
            {t('contact.hero.title')}
          </h1>
          <p
            className={cn(
              designSystem.typography.body.large,
              designSystem.typography.muted,
              'mb-8 sm:text-xl',
            )}
          >
            {t('contact.hero.description')}
          </p>
        </div>
      </PageContainer>

      {/* Channel Selector */}
      <PageContainer>
        <SectionContainer spacing="sm">
          <div className={cn(
            'grid gap-4',
            featureFlags.chat ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2',
          )}>
            {channels.map((channel) => {
              const Icon = channel.icon
              const isActive = activeChannel === channel.id
              const isMeeting = channel.id === 'meeting'

              return (
                <button
                  key={channel.id}
                  onClick={() => {
                    if (isMeeting) {
                      window.open(BOOKING_URL, '_blank')
                    } else {
                      setActiveChannel(isActive ? null : channel.id as 'form' | 'chat')
                    }
                  }}
                  className={cn(
                    'group relative rounded-xl border p-6 text-left transition-all duration-200',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border bg-card hover:shadow-md',
                    !isActive && channel.hoverBorder,
                  )}
                >
                  <div className={cn('mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg', channel.bg)}>
                    <Icon className={cn('h-5 w-5', channel.accent)} />
                  </div>
                  <h3 className={cn(designSystem.typography.heading.h5, 'mb-1')}>
                    {channel.title}
                  </h3>
                  <p className={cn(designSystem.typography.body.small, designSystem.typography.muted)}>
                    {channel.description}
                  </p>
                  {isMeeting && (
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Opens Outlook Booking
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </SectionContainer>
      </PageContainer>

      {/* Contact Form (expanded) */}
      {activeChannel === 'form' && (
        <PageContainer>
          <SectionContainer spacing="md">
            <div className="mx-auto max-w-2xl">
              <StandardCard id="contact-form">
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-6')}>
                  {t('contact.form.title')}
                </h2>

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

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className={cn(designSystem.grid.responsive.two, designSystem.spacing.gap.md)}>
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('contact.form.fullName')}</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} onBlur={handleFieldBlur} aria-invalid={Boolean(nameError)} required placeholder={t('contact.form.placeholders.name')} disabled={isSubmitting} className={cn(nameError && 'border-destructive focus-visible:ring-destructive/40')} />
                      {nameError && <p role="alert" className={errorTextClassName}>{nameError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('contact.form.email')}</Label>
                      <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} onBlur={handleFieldBlur} aria-invalid={Boolean(emailError)} required placeholder={t('contact.form.placeholders.email')} disabled={isSubmitting} className={cn(emailError && 'border-destructive focus-visible:ring-destructive/40')} />
                      {emailError && <p role="alert" className={errorTextClassName}>{emailError}</p>}
                    </div>
                  </div>

                  <div className={cn(designSystem.grid.responsive.two, designSystem.spacing.gap.md)}>
                    <div className="space-y-2">
                      <Label htmlFor="company">{t('contact.form.company')}</Label>
                      <Input id="company" name="company" value={formData.company} onChange={handleChange} onBlur={handleFieldBlur} placeholder={t('contact.form.placeholders.company')} disabled={isSubmitting} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">{t('contact.form.subject')}</Label>
                      <Select value={formData.subject} onValueChange={handleSubjectChange} disabled={isSubmitting}>
                        <SelectTrigger id="subject" aria-invalid={Boolean(subjectError)} className={cn(subjectError && 'border-destructive focus:ring-destructive/40')}>
                          <SelectValue placeholder={t('contact.form.placeholders.subject')} />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {subjectError && <p role="alert" className={errorTextClassName}>{subjectError}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{t('contact.form.message')}</Label>
                    <Textarea id="message" name="message" value={formData.message} onChange={handleChange} onBlur={handleFieldBlur} aria-invalid={Boolean(messageError)} required placeholder={t('contact.form.placeholders.message')} rows={6} disabled={isSubmitting} className={cn(messageError && 'border-destructive focus-visible:ring-destructive/40')} />
                    {messageError && <p role="alert" className={errorTextClassName}>{messageError}</p>}
                  </div>

                  <div ref={turnstileRef} className="flex justify-center overflow-x-auto" />

                  <Button type="submit" className="w-full min-h-11" disabled={isSubmitDisabled} size="lg">
                    {isSubmitting ? (
                      <><Loader2 className={cn('mr-2 h-4 w-4', designSystem.animation.loading)} />{t('contact.form.sending')}</>
                    ) : (
                      <>{t('contact.form.submit')}<Send className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </StandardCard>
            </div>
          </SectionContainer>
        </PageContainer>
      )}

      {/* AI Chat (expanded) */}
      {activeChannel === 'chat' && featureFlags.chat && (
        <PageContainer>
          <SectionContainer spacing="md">
            <div className="mx-auto max-w-2xl">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-semibold">Chat with Start HN</span>
                </div>
                <ChatPanel height="h-[450px]" />
              </div>
            </div>
          </SectionContainer>
        </PageContainer>
      )}

      {/* Contact Info Strip */}
      <PageContainer>
        <SectionContainer spacing="md">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {contactMethods.map((method) => (
              <div key={method.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-4">
                <div className="rounded-md bg-primary/10 p-2">
                  <method.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className={cn(designSystem.typography.body.small, 'font-medium')}>{method.title}</p>
                  {method.action ? (
                    <a href={method.action} target={method.action.startsWith('http') ? '_blank' : undefined} rel={method.action.startsWith('http') ? 'noopener noreferrer' : undefined} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                      {method.value}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">{method.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionContainer>
      </PageContainer>
    </div>
  )
}
