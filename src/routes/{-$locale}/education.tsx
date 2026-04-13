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
  BookOpen,
  Cloud,
  Brain,
  Settings,
  Code,
  Database,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { featureFlags } from '@/lib/feature-flags'

export const Route = createFileRoute('/{-$locale}/education')({
  head: () => ({
    meta: [
      { title: 'Education — Horizon Tech' },
      {
        name: 'description',
        content:
          'Horizon Tech educational resources and technology learning.',
      },
      { property: 'og:title', content: 'Education — Horizon Tech' },
      {
        property: 'og:description',
        content:
          'Horizon Tech educational resources and technology learning.',
      },
    ],
  }),
  beforeLoad: () => {
    if (!featureFlags.technicalResources) throw redirect({ to: '/' as any, replace: true })
  },
  component: EducationPage,
})

function EducationPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  const iconMap = {
    cloud: Cloud,
    brain: Brain,
    settings: Settings,
    code: Code,
    database: Database,
  }

  const resourceCategoriesRaw = t('education.categories', {
    returnObjects: true,
  })
  const resourceCategories = (typeof resourceCategoriesRaw === 'string' ? [] : resourceCategoriesRaw) as {
    icon: keyof typeof iconMap
    title: string
    description: string
    resources: { title: string; type: string }[]
  }[]

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Link to={withLocalePath('/', currentLocale)}>
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('education.backHome')}
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('education.title')}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('education.subtitle')}
        </p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5 md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t('education.hub.title')}
            </CardTitle>
            <CardDescription>
              {t('education.hub.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('education.hub.note')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resourceCategories.map((category) => {
          const Icon = iconMap[category.icon]
          return (
            <Card key={category.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-primary" />
                  {category.title}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.resources.map((resource) => (
                    <div
                      key={resource.title}
                      className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{resource.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {resource.type}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t('education.training.title')}</CardTitle>
          <CardDescription>
            {t('education.training.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            {t('education.training.text')}
          </p>
          <Link to={withLocalePath('/contact', currentLocale)}>
            <Button>{t('education.training.button')}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
