import { createFileRoute, Link, redirect, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MessageCircle,
  Mail,
  FileQuestion,
  BookOpen,
  ArrowLeft,
} from 'lucide-react'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { featureFlags } from '@/lib/feature-flags'

export const Route = createFileRoute('/{-$locale}/support')({
  head: () => ({
    meta: [
      { title: 'Support — Horizon Tech' },
      {
        name: 'description',
        content:
          'Get support from Horizon Tech for your enterprise software needs.',
      },
      { property: 'og:title', content: 'Support — Horizon Tech' },
      {
        property: 'og:description',
        content:
          'Get support from Horizon Tech for your enterprise software needs.',
      },
    ],
  }),
  beforeLoad: () => {
    if (!featureFlags.technicalResources) throw redirect({ to: '/' as any, replace: true })
  },
  component: SupportPage,
})

function SupportPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const faqsRaw = t('support.faqs', { returnObjects: true })
  const faqs = (typeof faqsRaw === 'string' ? [] : faqsRaw) as {
    question: string
    answer: string
  }[]

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Link to={withLocalePath('/', currentLocale)}>
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('support.backHome')}
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('support.title')}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('support.subtitle')}
        </p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('support.cards.email.title')}
            </CardTitle>
            <CardDescription>
              {t('support.cards.email.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="mailto:hello@horizon-tech.io">
              <Button className="w-full">hello@horizon-tech.io</Button>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {t('support.cards.project.title')}
            </CardTitle>
            <CardDescription>
              {t('support.cards.project.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={withLocalePath('/contact', currentLocale)}>
              <Button variant="outline" className="w-full">
                {t('support.cards.project.button')}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t('support.cards.resources.title')}
            </CardTitle>
            <CardDescription>
              {t('support.cards.resources.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={withLocalePath('/education', currentLocale)}>
              <Button variant="outline" className="w-full">
                {t('support.cards.resources.button')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            {t('support.faqTitle')}
          </CardTitle>
          <CardDescription>{t('support.faqDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className={index === faqs.length - 1 ? '' : 'border-b pb-4'}
            >
              <h3 className="mb-2 font-medium">{faq.question}</h3>
              <p className="text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
