import { useEffect, useMemo } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { getBlogPostBySlug } from '@/data/blog-posts'
import { getCaseStudyBySlug } from '@/data/case-studies'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleFromPath,
  stripLocalePrefix,
  withLocalePath,
} from '@/lib/i18n-utils'
import {
  SEO_PRIORITY_LOCALES,
  applyPageSeo,
  buildArticleStructuredData,
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
  buildPageSeo,
  removeStructuredData,
  upsertStructuredData,
} from '@/lib/seo'

type SeoMetaTranslation = {
  titleKey: string
  descriptionKey: string
  type?: 'website' | 'article' | 'profile'
}

type BlogArticleMeta = {
  headline: string
  description: string
  path: string
  datePublished?: string
  tags: string[]
}

type ResolvedSeoMeta = {
  title?: string
  description?: string
  titleKey?: string
  descriptionKey?: string
  type?: 'website' | 'article' | 'profile'
  keywords?: string[]
  robots?: string
  blogArticle?: BlogArticleMeta
}

const NOINDEX_PREFIXES = [
  '/admin',
  '/profile',
  '/dashboard',
  '/first-time-setup',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/confirm-email',
  '/auth',
  '/unauthorized',
  '/workspace',
]

const SEO_ROUTE_MAP: Record<string, SeoMetaTranslation> = {
  '/': { titleKey: 'seo:pages.home.title', descriptionKey: 'seo:pages.home.description' },
  '/about': { titleKey: 'seo:pages.about.title', descriptionKey: 'seo:pages.about.description' },
  '/team': { titleKey: 'seo:pages.team.title', descriptionKey: 'seo:pages.team.description' },
  '/careers': { titleKey: 'seo:pages.careers.title', descriptionKey: 'seo:pages.careers.description' },
  '/contact': { titleKey: 'seo:pages.contact.title', descriptionKey: 'seo:pages.contact.description' },
  '/case-studies': {
    titleKey: 'seo:pages.caseStudies.title',
    descriptionKey: 'seo:pages.caseStudies.description',
  },
  '/blog': { titleKey: 'seo:pages.blog.title', descriptionKey: 'seo:pages.blog.description' },
  '/education': {
    titleKey: 'seo:pages.education.title',
    descriptionKey: 'seo:pages.education.description',
  },
  '/support': { titleKey: 'seo:pages.support.title', descriptionKey: 'seo:pages.support.description' },
  '/privacy': { titleKey: 'seo:pages.privacy.title', descriptionKey: 'seo:pages.privacy.description' },
  '/terms': { titleKey: 'seo:pages.terms.title', descriptionKey: 'seo:pages.terms.description' },
  '/profile': { titleKey: 'seo:pages.profile.title', descriptionKey: 'seo:pages.profile.description' },
  '/first-time-setup': {
    titleKey: 'seo:pages.firstTimeSetup.title',
    descriptionKey: 'seo:pages.firstTimeSetup.description',
  },
  '/forgot-password': {
    titleKey: 'seo:pages.forgotPassword.title',
    descriptionKey: 'seo:pages.forgotPassword.description',
  },
  '/reset-password': {
    titleKey: 'seo:pages.resetPassword.title',
    descriptionKey: 'seo:pages.resetPassword.description',
  },
  '/confirm-email': {
    titleKey: 'seo:pages.confirmEmail.title',
    descriptionKey: 'seo:pages.confirmEmail.description',
  },
  '/admin': { titleKey: 'seo:pages.admin.title', descriptionKey: 'seo:pages.admin.description' },
  '/services/enterprise-software-development': {
    titleKey: 'seo:pages.servicesEnterprise.title',
    descriptionKey: 'seo:pages.servicesEnterprise.description',
  },
  '/services/ai-ml-business-intelligence': {
    titleKey: 'seo:pages.servicesAiMl.title',
    descriptionKey: 'seo:pages.servicesAiMl.description',
  },
  '/services/cloud-architecture': {
    titleKey: 'seo:pages.servicesCloudArchitecture.title',
    descriptionKey: 'seo:pages.servicesCloudArchitecture.description',
  },
  '/services/iot-edge-computing': {
    titleKey: 'seo:pages.servicesIotEdge.title',
    descriptionKey: 'seo:pages.servicesIotEdge.description',
  },
  '/services/devops-platform-engineering': {
    titleKey: 'seo:pages.servicesDevOps.title',
    descriptionKey: 'seo:pages.servicesDevOps.description',
  },
  '/services/digital-transformation': {
    titleKey: 'seo:pages.servicesDigitalTransformation.title',
    descriptionKey: 'seo:pages.servicesDigitalTransformation.description',
  },
  '/innovation-lab': {
    titleKey: 'seo:pages.innovationLab.title',
    descriptionKey: 'seo:pages.innovationLab.description',
  },
  '/innovation-lab/ai-systems': {
    titleKey: 'seo:pages.innovationLabAiSystems.title',
    descriptionKey: 'seo:pages.innovationLabAiSystems.description',
  },
  '/innovation-lab/nlp': {
    titleKey: 'seo:pages.innovationLabNlp.title',
    descriptionKey: 'seo:pages.innovationLabNlp.description',
  },
  '/innovation-lab/genetic-algorithm': {
    titleKey: 'seo:pages.innovationLabGeneticAlgorithm.title',
    descriptionKey: 'seo:pages.innovationLabGeneticAlgorithm.description',
  },
  '/unauthorized': {
    titleKey: 'seo:pages.unauthorized.title',
    descriptionKey: 'seo:pages.unauthorized.description',
  },
}

function upsertPropertyMeta(name: string, content: string) {
  let node = document.head.querySelector(
    `meta[property="${name}"][data-seo-article-meta="true"]`,
  ) as HTMLMetaElement | null

  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('property', name)
    node.setAttribute('data-seo-article-meta', 'true')
    document.head.appendChild(node)
  }

  node.setAttribute('content', content)
}

function clearArticleMeta() {
  document.head
    .querySelectorAll('meta[data-seo-article-meta="true"]')
    .forEach((node) => node.remove())
}

function isNoindexRoute(path: string): boolean {
  return NOINDEX_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}

function resolveSeoMeta(normalizedPath: string): ResolvedSeoMeta {
  const robots = isNoindexRoute(normalizedPath) ? 'noindex,nofollow' : undefined

  const directMatch = SEO_ROUTE_MAP[normalizedPath]
  if (directMatch) {
    return {
      titleKey: directMatch.titleKey,
      descriptionKey: directMatch.descriptionKey,
      type: directMatch.type ?? 'website',
      robots,
    }
  }

  if (normalizedPath.startsWith('/blog/')) {
    const slug = normalizedPath.replace('/blog/', '')
    const post = getBlogPostBySlug(slug)

    if (post) {
      return {
        title: `${post.title} | Start HN Blog`,
        description: post.excerpt,
        type: 'article',
        keywords: post.tags,
        robots,
        blogArticle: {
          headline: post.title,
          description: post.excerpt,
          path: normalizedPath,
          datePublished: post.publishedAt,
          tags: post.tags,
        },
      }
    }

    return {
      titleKey: 'seo:pages.blogPost.title',
      descriptionKey: 'seo:pages.blogPost.description',
      type: 'article',
      robots,
    }
  }

  if (normalizedPath.startsWith('/case-studies/')) {
    const id = normalizedPath.replace('/case-studies/', '')
    const caseStudy = getCaseStudyBySlug(id)

    if (caseStudy) {
      return {
        title: `${caseStudy.title} | Start HN`,
        description: caseStudy.description,
        type: 'article',
        keywords: [...caseStudy.tags, caseStudy.industry],
        robots,
      }
    }

    return {
      titleKey: 'seo:pages.caseStudyDetail.title',
      descriptionKey: 'seo:pages.caseStudyDetail.description',
      type: 'article',
      robots,
    }
  }

  if (normalizedPath.startsWith('/services/')) {
    return {
      titleKey: 'seo:pages.services.title',
      descriptionKey: 'seo:pages.services.description',
      robots,
    }
  }

  if (normalizedPath.startsWith('/innovation-lab')) {
    return {
      titleKey: 'seo:pages.innovationLab.title',
      descriptionKey: 'seo:pages.innovationLab.description',
      robots,
    }
  }

  if (normalizedPath.startsWith('/auth/callback')) {
    return {
      titleKey: 'seo:pages.authCallback.title',
      descriptionKey: 'seo:pages.authCallback.description',
      robots,
    }
  }

  return {
    titleKey: 'seo:default.title',
    descriptionKey: 'seo:default.description',
    robots,
  }
}

const BREADCRUMB_SEGMENT_LABEL_KEY: Record<string, string> = {
  about: 'nav.about.title',
  team: 'nav.team.title',
  careers: 'nav.careers.title',
  contact: 'nav.contact',
  'case-studies': 'nav.caseStudies.title',
  blog: 'nav.blog.title',
  services: 'nav.solutions',
  'innovation-lab': 'nav.innovationLab',
  education: 'nav.education.title',
  support: 'nav.support.title',
}

function titleizeSegment(segment: string) {
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Syncs language and SEO tags with the current locale URL.
 * Call once in __root.tsx.
 */
export function useI18nMeta() {
  const { i18n } = useTranslation(['common', 'seo'])
  const location = useLocation()
  const locale = getLocaleFromPath(location.pathname)
  const normalizedPath = useMemo(
    () => stripLocalePrefix(location.pathname),
    [location.pathname],
  )
  const seoMeta = useMemo(() => resolveSeoMeta(normalizedPath), [normalizedPath])

  useEffect(() => {
    const currentLocale = (SUPPORTED_LOCALES as readonly string[]).includes(locale)
      ? locale
      : DEFAULT_LOCALE
    const title = seoMeta.title ??
      i18n.t(seoMeta.titleKey ?? 'seo:default.title', {
        defaultValue: i18n.t('seo:default.title'),
      })
    const description = seoMeta.description ??
      i18n.t(seoMeta.descriptionKey ?? 'seo:default.description', {
        defaultValue: i18n.t('seo:default.description'),
      })

    document.documentElement.lang = currentLocale

    if (typeof window === 'undefined') return

    const origin = window.location.origin

    const isPriorityLocale = (SEO_PRIORITY_LOCALES as readonly string[]).includes(currentLocale)

    // Route-based noindex (private pages) takes priority, then locale-based noindex
    const robots = seoMeta.robots
      ?? (!isPriorityLocale ? 'noindex,follow' : 'index,follow')

    const seo = buildPageSeo({
      title,
      description,
      origin,
      pathname: normalizedPath,
      locale: currentLocale,
      type: seoMeta.type,
      keywords: seoMeta.keywords,
      robots,
      canonicalLocale: !isPriorityLocale ? DEFAULT_LOCALE : undefined,
      skipAlternates: !isPriorityLocale,
    })
    applyPageSeo(seo)

    clearArticleMeta()

    if (seoMeta.blogArticle) {
      if (seoMeta.blogArticle.datePublished) {
        upsertPropertyMeta('article:published_time', seoMeta.blogArticle.datePublished)
      }

      seoMeta.blogArticle.tags.forEach((tag) => {
        const tagNode = document.createElement('meta')
        tagNode.setAttribute('property', 'article:tag')
        tagNode.setAttribute('content', tag)
        tagNode.setAttribute('data-seo-article-meta', 'true')
        document.head.appendChild(tagNode)
      })

      upsertStructuredData(
        'blog-article',
        buildArticleStructuredData({
          origin,
          headline: seoMeta.blogArticle.headline,
          description: seoMeta.blogArticle.description,
          path: withLocalePath(seoMeta.blogArticle.path, currentLocale),
          datePublished: seoMeta.blogArticle.datePublished,
          dateModified: seoMeta.blogArticle.datePublished,
        }),
      )
    } else {
      removeStructuredData('blog-article')
    }

    const pathSegments = normalizedPath.split('/').filter(Boolean)
    const breadcrumbItems = [
      {
        name: i18n.t('nav.home'),
        path: withLocalePath('/', currentLocale),
      },
    ]

    let currentPath = ''
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`
      const labelKey = BREADCRUMB_SEGMENT_LABEL_KEY[segment]
      breadcrumbItems.push({
        name: labelKey ? i18n.t(labelKey) : titleizeSegment(segment),
        path: withLocalePath(currentPath, currentLocale),
      })
    })

    upsertStructuredData(
      'organization',
      buildOrganizationStructuredData({
        origin,
        description,
        sameAs: [
          'https://github.com/Horizon-Tech-d-o-o',
          'https://www.linkedin.com/company/horizon-tech-d-o-o',
        ],
      })
    )

    upsertStructuredData(
      'breadcrumbs',
      buildBreadcrumbStructuredData({
        origin,
        items: breadcrumbItems,
      })
    )
  }, [i18n, i18n.language, locale, normalizedPath, seoMeta])
}
