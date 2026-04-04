import { Suspense, lazy } from 'react'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { cn } from '@/lib/utils'
import type { ScrollData } from '@/hooks/useScrollSections'

const GlobeVisualization = lazy(() =>
  import('@/components/globe/GlobeVisualization').then((module) => ({
    default: module.GlobeVisualization,
  })),
)

interface GlobeContainerProps {
  scrollDataRef: React.MutableRefObject<ScrollData>
}

function GlobeFallback() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-full border border-primary/20 bg-primary/5">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/15 via-transparent to-accent/15" />
      <div className="absolute inset-[18%] rounded-full border border-primary/20" />
      <div className="absolute inset-[32%] rounded-full border border-primary/15" />
    </div>
  )
}

export function GlobeContainer({ scrollDataRef }: GlobeContainerProps) {
  const layout = useResponsiveLayout()

  // Don't render if globe shouldn't be visible
  if (!layout.globeVisible) {
    return null
  }

  const initialDataCenter = scrollDataRef?.current?.fromDataCenter

  const isRight = layout.globePosition === 'right'

  return (
    <div
      className={cn(
        'fixed top-1/2 z-[15]',
        'pointer-events-none',
        isRight ? 'right-0' : 'left-1/2'
      )}
      style={{
        // 30% larger than configured size so effects have room to breathe
        width: `calc(${layout.globeSize} * 1.3)`,
        height: `calc(${layout.globeSize} * 1.3)`,
        transform: isRight ? 'translate(15%, -50%)' : 'translate(-50%, -50%)',
        opacity: layout.globeOpacity,
        // Radial gradient mask: full opacity center, smooth fade at edges
        WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at center, black 55%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 50% 50% at center, black 55%, transparent 100%)',
      }}
    >
      {/* Globe canvas */}
      <div className="w-full h-full pointer-events-none">
        <Suspense fallback={<GlobeFallback />}>
          <GlobeVisualization
            fromDataCenter={initialDataCenter}
            toDataCenter={initialDataCenter}
            scrollProgress={0}
            scrollDataRef={scrollDataRef}
            currentSection={scrollDataRef?.current?.fromSection || 'hero'}
          />
        </Suspense>
      </div>
    </div>
  )
}
