import { MutableRefObject } from 'react'
import { Globe } from './Globe'
import { OrbitingParticles } from './OrbitingParticles'
import { PostProcessing } from './PostProcessing'
import { SpaceBackground } from './SpaceBackground'
import { CameraController } from '../controllers/CameraController'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'
import type { GlobeConfig, ScrollData } from '../GlobeVisualization'
import type { DataCenterMarker } from '@/data/globe'

interface SceneProps {
  config: GlobeConfig
  fromDataCenter?: DataCenterMarker | null
  toDataCenter?: DataCenterMarker | null
  scrollProgress?: number
  scrollDataRef?: MutableRefObject<ScrollData>
}

function SceneInternal({ config, fromDataCenter, toDataCenter, scrollProgress, scrollDataRef }: SceneProps) {
  const isDark = useIsDarkMode()

  return (
    <>
      {/* Lighting — dramatic in both modes; slightly brighter ambient in light */}
      <ambientLight intensity={isDark ? 0.3 : 0.4} color="#ffffff" />
      <directionalLight position={[5, 3, 5]} intensity={1.0} color="#ffffff" />
      <directionalLight position={[-4, 2, -4]} intensity={0.6} color="#a855f7" />
      <pointLight position={[0, -3, 4]} intensity={0.4} color="#ff6b35" />

      {/* Space background is dark-mode only so light mode stays clean and airy. */}
      {isDark && config.showSpaceBackground && <SpaceBackground />}

      {/* Orbiting particles - count based on performance tier */}
      {(config.particleCount ?? 0) > 0 && (
        <OrbitingParticles count={config.particleCount} />
      )}

      <Globe
        config={config}
        fromDataCenter={fromDataCenter}
        toDataCenter={toDataCenter}
        scrollProgress={scrollProgress}
        scrollDataRef={scrollDataRef}
      />

      {/* Camera controller for smooth focus transitions */}
      <CameraController
        focusDataCenter={fromDataCenter}
        scrollDataRef={scrollDataRef}
        enableUserControl={true}
        enableAnimation={config.enableCameraAnimation ?? true}
      />

      {/* Post-processing is dark-mode only to avoid hazy light-mode rendering. */}
      {isDark && config.showPostProcessing && <PostProcessing showChromaticAberration={config.showChromaticAberration} />}
    </>
  )
}

// Export without memo to allow continuous scroll updates
// Globe rotation is handled by useFrame in useScrollRotation hook
export const Scene = SceneInternal
