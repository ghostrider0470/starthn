/**
 * Landing page layout with integrated globe as ambient background
 * Globe renders behind content as a visual element
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useScrollSections } from '@/hooks/useScrollSections'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { buildLandingSections } from '@/config/landing-sections'
import { GlobeContainer } from './GlobeContainer'
import { SideNavigation } from './SideNavigation'

interface LandingPageLayoutProps {
  children: React.ReactNode
}

export function LandingPageLayout({ children }: LandingPageLayoutProps) {
  const layout = useResponsiveLayout()
  const { t, i18n } = useTranslation()

  const sections = useMemo(() => buildLandingSections(t), [t, i18n.language])

  const {
    activeSection,
    scrollDataRef,
    scrollToSection,
    sections: trackedSections
  } = useScrollSections({
    sections,
    onSectionChange: (sectionId) => {
      if (import.meta.env.DEV) {
        console.log('Active section:', sectionId)
      }
    },
  })

  return (
    <div className="relative min-h-screen">
      {/* Ambient background layers for depth across landing sections */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,107,53,0.14),transparent_42%),radial-gradient(circle_at_85%_12%,rgba(168,85,247,0.11),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(255,107,53,0.09),transparent_48%)] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(255,107,53,0.16),transparent_42%),radial-gradient(circle_at_85%_12%,rgba(168,85,247,0.13),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(255,107,53,0.11),transparent_48%)]" />
        <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.045] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      {/* Globe as background layer - fixed, renders behind content */}
      {layout.globeVisible && (
        <GlobeContainer scrollDataRef={scrollDataRef} />
      )}

      {/* Main content - z-20 ensures cards/text appear above globe (z-15) */}
      <div className="relative z-20">
        {children}
      </div>

      {/* Side navigation - fixed position overlay */}
      <SideNavigation
        activeSection={activeSection}
        scrollToSection={scrollToSection}
        sections={trackedSections}
      />
    </div>
  )
}
