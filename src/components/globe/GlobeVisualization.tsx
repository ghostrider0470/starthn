import { Suspense, Component, ErrorInfo, ReactNode, useRef, useEffect, useMemo, useCallback, memo, MutableRefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Scene } from './components/Scene'
import type { DataCenterMarker } from '@/data/globe'
import { useGlobePerformanceTier } from '@/hooks/useGlobePerformanceTier'

/**
 * Scroll data passed via ref to avoid re-renders.
 * Contains all information needed for smooth globe rotation, zoom, and camera elevation during scroll.
 */
export interface ScrollData {
  fromSection: string
  toSection: string
  progress: number  // 0-1 interpolation between fromDataCenter and toDataCenter
  fromDataCenter?: DataCenterMarker
  toDataCenter?: DataCenterMarker
  fromZoom?: number // Camera distance for from section (lower = closer)
  toZoom?: number   // Camera distance for to section (lower = closer)
  fromLat?: number  // Latitude of from data center (for camera elevation)
  toLat?: number    // Latitude of to data center (for camera elevation)
}

// Error boundary for 3D rendering failures
class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Globe rendering error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl">
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-accent opacity-20" />
            <h3 className="text-lg font-semibold mb-2">Rendering Error</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Failed to render 3D visualization
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading data visualization...</p>
      </div>
    </div>
  )
}

// WebGL support check - memoized to run only once
let webGLSupportCache: boolean | null = null
function hasWebGLSupport() {
  if (webGLSupportCache !== null) {
    return webGLSupportCache
  }

  try {
    const canvas = document.createElement('canvas')
    const hasSupport = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
    webGLSupportCache = hasSupport
    return hasSupport
  } catch (e) {
    webGLSupportCache = false
    return false
  }
}

function WebGLFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl">
      <div className="text-center p-8">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-accent opacity-20" />
        <h3 className="text-lg font-semibold mb-2">Global Data Network</h3>
        <p className="text-sm text-muted-foreground">
          Interactive 3D visualization requires WebGL support
        </p>
      </div>
    </div>
  )
}

export interface GlobeConfig {
  showSpaceBackground?: boolean
  showBeams?: boolean
  showRings?: boolean
  showConnections?: boolean
  showLabels?: boolean
  showPostProcessing?: boolean
  showChromaticAberration?: boolean
  showAurora?: boolean
  connectionCount?: number
  connectionCycleInterval?: number // milliseconds
  particleCount?: number
  atmosphereLayers?: number
  enableCameraAnimation?: boolean
  dpr?: number
}

interface GlobeVisualizationProps {
  config?: GlobeConfig
  fromDataCenter?: DataCenterMarker | null
  toDataCenter?: DataCenterMarker | null
  scrollProgress?: number
  scrollDataRef?: MutableRefObject<ScrollData>
  currentSection?: string
  onMarkerClick?: (marker: DataCenterMarker) => void
}

const defaultConfig: GlobeConfig = {
  showSpaceBackground: true,
  showBeams: false,
  showRings: true,
  showConnections: true,
  showLabels: false,
  showPostProcessing: true,
  showAurora: true,
  connectionCount: 50,
  connectionCycleInterval: 10000,
  particleCount: 100,
  atmosphereLayers: 3,
  enableCameraAnimation: true,
  dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
}

function GlobeVisualizationInternal({
  config = {},
  fromDataCenter,
  toDataCenter,
  scrollProgress,
  scrollDataRef,
  currentSection,
  onMarkerClick
}: GlobeVisualizationProps) {
  const { config: performanceConfig } = useGlobePerformanceTier()

  // Merge configs: user config > performance config > defaults
  const mergedConfig = useMemo(() => ({
    ...defaultConfig,
    showPostProcessing: performanceConfig.showPostProcessing,
    showAurora: performanceConfig.showAurora,
    showSpaceBackground: performanceConfig.showSpaceBackground,
    connectionCount: performanceConfig.connectionCount,
    particleCount: performanceConfig.particleCount,
    atmosphereLayers: performanceConfig.atmosphereLayers,
    enableCameraAnimation: performanceConfig.enableCameraAnimation,
    dpr: performanceConfig.dpr,
    ...config,
  }), [performanceConfig, config])

  const glRef = useRef<THREE.WebGLRenderer | null>(null)

  // Stable camera config to prevent Canvas re-creation
  const cameraConfig = useMemo(() => ({ position: [0, 0, 8] as [number, number, number], fov: 45 }), [])

  // Stable gl config to prevent Canvas re-creation
  const glConfig = useMemo(() => ({
    antialias: true,
    toneMapping: 0,
    toneMappingExposure: 1.2,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance' as const,
    failIfMajorPerformanceCaveat: false,
  }), [])

  // Stable onCreated callback
  const handleCanvasCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    glRef.current = gl

    const canvas = gl.domElement

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      console.warn('WebGL context lost - attempting recovery')
    })

    canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored')
    })
  }, [])

  // Cleanup WebGL resources on unmount
  useEffect(() => {
    return () => {
      if (glRef.current) {
        console.log('Disposing WebGL renderer...')
        glRef.current.dispose()
        glRef.current.forceContextLoss()
        glRef.current = null
      }
    }
  }, [])

  if (!hasWebGLSupport()) {
    return <WebGLFallback />
  }

  return (
    <div className="w-full h-full overflow-visible pointer-events-none">
      <CanvasErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            key="globe-canvas-stable"
            camera={cameraConfig}
            style={{ background: 'transparent', pointerEvents: 'auto' }}
            performance={{ min: 0.5 }}
            dpr={mergedConfig.dpr}
            gl={glConfig}
            onCreated={handleCanvasCreated}
          >
            <Scene
              config={mergedConfig}
              fromDataCenter={fromDataCenter}
              toDataCenter={toDataCenter}
              scrollProgress={scrollProgress}
              scrollDataRef={scrollDataRef}
            />
          </Canvas>
        </Suspense>
      </CanvasErrorBoundary>
    </div>
  )
}

/**
 * Memoized to prevent Canvas re-renders during scroll.
 *
 * Re-renders ONLY when:
 * - Data centers change (section transitions)
 * - Config changes (post-processing toggle)
 *
 * Scroll progress updates via scrollDataRef without re-rendering,
 * preventing WebGL context creation/loss.
 */
export const GlobeVisualization = memo(GlobeVisualizationInternal, (prev, next) => {
  // Return true to SKIP re-render, false to RE-RENDER
  if (prev.fromDataCenter?.name !== next.fromDataCenter?.name) return false
  if (prev.toDataCenter?.name !== next.toDataCenter?.name) return false
  if (prev.currentSection !== next.currentSection) return false
  if (prev.config?.showPostProcessing !== next.config?.showPostProcessing) return false

  return true // Skip re-render - props are equal
})
