/**
 * Centralized configuration for landing page sections
 * Defines all sections with their navigation labels and globe focus points
 */

import type { SectionConfig } from '@/hooks/useScrollSections'
import type { TFunction } from 'i18next'
import { DATA_CENTER_MARKERS } from '@/data/globe'
import { featureFlags } from '@/lib/feature-flags'

export function buildLandingSections(t: TFunction): Array<SectionConfig> {
  return ([
    {
      id: 'hero',
      label: t('sideNav.sections.home'),
      focusDataCenter: DATA_CENTER_MARKERS.find(m => m.name === 'Balkans Hub (Sarajevo)'),
      zoomLevel: 3,
    },
    {
      id: 'solutions',
      label: t('sideNav.sections.solutions'),
      focusDataCenter: DATA_CENTER_MARKERS.find(m => m.name === 'US East (Virginia)'),
      zoomLevel: 3,
    },
    {
      id: 'credibility',
      label: t('sideNav.sections.credibility'),
      focusDataCenter: DATA_CENTER_MARKERS.find(m => m.name === 'UK South (London)'),
      zoomLevel: 3,
    },
    {
      id: 'partners',
      label: t('sideNav.sections.partners'),
      focusDataCenter: DATA_CENTER_MARKERS.find(m => m.name === 'Asia Pacific (Singapore)'),
      zoomLevel: 3,
    },
    {
      id: 'case-studies',
      label: t('sideNav.sections.caseStudies'),
      focusDataCenter: DATA_CENTER_MARKERS.find(m => m.name === 'Europe (Frankfurt)'),
      zoomLevel: 3,
    },
    {
      id: 'blog',
      label: t('sideNav.sections.blog'),
      focusDataCenter: DATA_CENTER_MARKERS.find(m => m.name === 'West Europe (Netherlands)'),
      zoomLevel: 3,
    },
    featureFlags.innovationLab ? {
      id: 'innovation-lab',
      label: t('sideNav.sections.innovationLab'),
      focusDataCenter: DATA_CENTER_MARKERS.find(m => m.name === 'Balkans Hub (Sarajevo)'),
      zoomLevel: 3,
    } : null,
    {
      id: 'faq',
      label: t('sideNav.sections.faq'),
      focusDataCenter: DATA_CENTER_MARKERS.find(m => m.name === 'South America (São Paulo)'),
      zoomLevel: 3,
    },
  ] as Array<SectionConfig | null>).filter((s): s is SectionConfig => s !== null)
}
