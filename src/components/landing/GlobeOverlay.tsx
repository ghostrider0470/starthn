import { GlobeVisualization } from '@/components/globe/GlobeVisualization'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import type { ScrollData } from '@/hooks/useScrollSections'

interface GlobeOverlayProps {
  scrollDataRef: React.MutableRefObject<ScrollData>
}

export function GlobeOverlay({ scrollDataRef }: GlobeOverlayProps) {
  const layout = useResponsiveLayout()

  // Don't render if globe shouldn't be visible
  if (!layout.globeVisible) {
    return null
  }

  // Get initial data center from scroll ref
  const initialDataCenter = scrollDataRef?.current?.fromDataCenter

  return (
    <div className="fixed top-0 right-0 left-0 bottom-[400px] z-20 pointer-events-none hidden md:flex justify-end items-center overflow-visible">
      {/* Globe Overlay - Positioned on right side with flexbox */}
      <div className="w-[800px] h-full pointer-events-auto overflow-visible">
        <GlobeVisualization
          fromDataCenter={initialDataCenter}
          toDataCenter={initialDataCenter}
          scrollProgress={0}
          scrollDataRef={scrollDataRef}
          currentSection={scrollDataRef?.current?.fromSection || 'hero'}
        />
      </div>
    </div>
  )
}
