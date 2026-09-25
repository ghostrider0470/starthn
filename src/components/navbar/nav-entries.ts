import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import { featureFlags } from '@/lib/feature-flags'
import { SERVICE_ROUTES } from '@/lib/service-routes'

/**
 * The header navigation entries, shared by the static header markup (entry
 * chunk) and the on-demand interactive versions (desktop dropdown menu,
 * mobile menu sheet).
 */

export type NavRouteItem = {
  title: string
  href: string
  description: string
}

export type NavDropdownEntry = {
  type: 'dropdown'
  id: 'solutions' | 'resources' | 'company'
  title: string
  items: Array<NavRouteItem>
}

export type NavLinkEntry = {
  type: 'link'
  id: 'case-studies' | 'solutions' | 'contact'
  title: string
  href: string
}

export type DesktopNavEntry = NavDropdownEntry | NavLinkEntry

export type NavEntries = {
  desktopNavEntries: Array<DesktopNavEntry>
  mobileQuickLinks: Array<NavLinkEntry>
  mobileAccordionGroups: Array<NavDropdownEntry>
}

export function useNavEntries(t: TFunction): NavEntries {
  return useMemo(() => {
    const solutionItems: Array<NavRouteItem> = [
      {
        title: t('nav.enterpriseSoftware.title'),
        href: SERVICE_ROUTES.bookkeeping,
        description: t('nav.enterpriseSoftware.description'),
      },
      {
        title: t('nav.aiMl.title'),
        href: SERVICE_ROUTES.taxConsulting,
        description: t('nav.aiMl.description'),
      },
      {
        title: t('nav.cloudArchitecture.title'),
        href: SERVICE_ROUTES.virtualCfo,
        description: t('nav.cloudArchitecture.description'),
      },
      {
        title: t('nav.iot.title'),
        href: SERVICE_ROUTES.businessConsulting,
        description: t('nav.iot.description'),
      },
      {
        title: t('nav.devops.title'),
        href: SERVICE_ROUTES.financialReporting,
        description: t('nav.devops.description'),
      },
      {
        title: t('nav.digitalTransformation.title'),
        href: SERVICE_ROUTES.education,
        description: t('nav.digitalTransformation.description'),
      },
    ]

    const resourcesItems: Array<NavRouteItem> = [
      {
        title: t('nav.blog.title'),
        href: '/blog',
        description: t('nav.blog.description'),
      },
      ...(featureFlags.technicalResources
        ? [
            {
              title: t('nav.education.title'),
              href: '/education',
              description: t('nav.education.description'),
            },
            {
              title: t('nav.support.title'),
              href: '/support',
              description: t('nav.support.description'),
            },
          ]
        : []),
    ]

    const companyItems: Array<NavRouteItem> = [
      {
        title: t('nav.about.title'),
        href: '/about',
        description: t('nav.about.description'),
      },
      {
        title: t('nav.missionVision.title'),
        href: '/mission-vision',
        description: t('nav.missionVision.description'),
      },
      {
        title: t('nav.certificates.title'),
        href: '/certificates',
        description: t('nav.certificates.description'),
      },
      {
        title: t('nav.careers.title'),
        href: '/careers',
        description: t('nav.careers.description'),
      },
    ]

    const desktopEntries: Array<DesktopNavEntry> = [
      {
        type: 'dropdown',
        id: 'solutions',
        title: t('nav.solutions'),
        items: solutionItems,
      },
      ...(featureFlags.caseStudies
        ? [
            {
              type: 'link' as const,
              id: 'case-studies' as const,
              title: t('nav.caseStudies.title'),
              href: '/case-studies',
            },
          ]
        : []),
      {
        type: 'dropdown',
        id: 'resources',
        title: t('nav.resources'),
        items: resourcesItems,
      },
      {
        type: 'dropdown',
        id: 'company',
        title: t('nav.company'),
        items: companyItems,
      },
    ]

    // "Usluge" is not repeated here: the accordion below lists every
    // service, and the bottom nav links the services overview.
    const compactQuickLinks: Array<NavLinkEntry> = [
      ...(featureFlags.caseStudies
        ? [
            {
              type: 'link' as const,
              id: 'case-studies' as const,
              title: t('nav.caseStudies.title'),
              href: '/case-studies',
            },
          ]
        : []),
      {
        type: 'link',
        id: 'contact',
        title: t('nav.contact'),
        href: '/contact',
      },
    ]

    const accordionGroups = desktopEntries.filter(
      (entry): entry is NavDropdownEntry => entry.type === 'dropdown',
    )

    return {
      desktopNavEntries: desktopEntries,
      mobileQuickLinks: compactQuickLinks,
      mobileAccordionGroups: accordionGroups,
    }
  }, [t])
}
