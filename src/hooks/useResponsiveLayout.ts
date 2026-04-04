import { useState, useEffect } from 'react'
import { useIsDarkMode } from './useIsDarkMode'

export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'xl'

interface LayoutConfig {
  screenSize: ScreenSize
  /** Whether globe is visible on this screen size */
  globeVisible: boolean
  /** Whether side navigation is visible */
  navVisible: boolean
  /** Opacity for globe (0-1) - used for background transparency */
  globeOpacity: number
  /** Globe placement strategy: center (mobile/tablet) or right-bleed (desktop+) */
  globePosition: 'center' | 'right'
  /** CSS size value for the globe container (width & height) */
  globeSize: string
}

// Dark mode: low opacity — globe blends subtly into dark background
// Light mode: higher opacity — globe needs to be visible against white
const OPACITY: Record<ScreenSize, { dark: number; light: number }> = {
  mobile:  { dark: 0.35, light: 0.34 },
  tablet:  { dark: 0.35, light: 0.38 },
  desktop: { dark: 0.28, light: 0.46 },
  xl:      { dark: 0.30, light: 0.50 },
}

export function useResponsiveLayout(): LayoutConfig {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop')
  const isDark = useIsDarkMode()

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth

      if (width < 768) {
        setScreenSize('mobile')
      } else if (width < 1024) {
        setScreenSize('tablet')
      } else if (width < 1536) {
        setScreenSize('desktop')
      } else {
        setScreenSize('xl')
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const opacity = isDark ? OPACITY[screenSize].dark : OPACITY[screenSize].light

  const configs: Record<ScreenSize, LayoutConfig> = {
    mobile: {
      screenSize: 'mobile',
      globeVisible: true,
      navVisible: false,
      globeOpacity: opacity,
      globePosition: 'center',
      globeSize: 'min(900px, 90vw, 80vh)',
    },
    tablet: {
      screenSize: 'tablet',
      globeVisible: true,
      navVisible: true,
      globeOpacity: opacity,
      globePosition: 'center',
      globeSize: 'min(900px, 90vw, 80vh)',
    },
    desktop: {
      screenSize: 'desktop',
      globeVisible: true,
      navVisible: true,
      globeOpacity: opacity,
      globePosition: 'right',
      globeSize: 'min(800px, 55vw, 80vh)',
    },
    xl: {
      screenSize: 'xl',
      globeVisible: true,
      navVisible: true,
      globeOpacity: opacity,
      globePosition: 'right',
      globeSize: 'min(900px, 50vw, 85vh)',
    },
  }

  return configs[screenSize]
}
