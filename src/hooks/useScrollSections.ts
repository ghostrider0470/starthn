/**
 * Centralized scroll section management for landing page
 * Provides section tracking, progress calculation, and programmatic navigation
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { DataCenterMarker } from '@/data/globe'

export interface SectionConfig {
  id: string
  label: string
  focusDataCenter?: DataCenterMarker
  zoomLevel?: number
}

export interface ScrollData {
  fromSection: string
  toSection: string
  progress: number
  fromDataCenter?: DataCenterMarker
  toDataCenter?: DataCenterMarker
  fromZoom: number
  toZoom: number
  fromLat: number
  toLat: number
}

interface UseScrollSectionsOptions {
  sections: SectionConfig[]
  onSectionChange?: (sectionId: string) => void
}

export function useScrollSections({ sections, onSectionChange }: UseScrollSectionsOptions) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || '')
  const [isScrolling, setIsScrolling] = useState(false)

  // Use refs to avoid re-registering scroll listener on every section change
  const activeSectionRef = useRef(activeSection)
  activeSectionRef.current = activeSection
  const onSectionChangeRef = useRef(onSectionChange)
  onSectionChangeRef.current = onSectionChange

  /**
   * Ref for continuous scroll updates without triggering React re-renders.
   * Updated at 60fps via RAF, read by globe controllers in useFrame.
   */
  const scrollDataRef = useRef<ScrollData>({
    fromSection: sections[0]?.id || '',
    toSection: sections[0]?.id || '',
    progress: 0,
    fromDataCenter: sections[0]?.focusDataCenter,
    toDataCenter: sections[0]?.focusDataCenter,
    fromZoom: sections[0]?.zoomLevel || 3,
    toZoom: sections[0]?.zoomLevel || 3,
    fromLat: sections[0]?.focusDataCenter?.lat || 0,
    toLat: sections[0]?.focusDataCenter?.lat || 0,
  })

  // Track scroll position and calculate section transitions
  useEffect(() => {
    let rafId: number | null = null
    let scrollTimeout: NodeJS.Timeout | null = null

    const handleScroll = () => {
      // Cancel any pending RAF
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }

      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }

      setIsScrolling(true)

      // Use RAF to throttle to animation frames (60fps max)
      rafId = requestAnimationFrame(() => {
        // Get all section elements and their positions
        const sectionData = sections.map((section) => {
          const element = document.getElementById(section.id)
          if (!element) return null

          const rect = element.getBoundingClientRect()
          const top = rect.top + window.scrollY
          const bottom = rect.bottom + window.scrollY

          return {
            id: section.id,
            config: section,
            top,
            bottom
          }
        }).filter(Boolean) as Array<{
          id: string
          config: SectionConfig
          top: number
          bottom: number
        }>

        if (sectionData.length === 0) return

        const scrollY = window.scrollY
        let fromSection = sections[0].id
        let toSection = sections[0].id
        let progress = 0
        let newActiveSection = sections[0].id

        // Check if we're before the first section
        if (scrollY < sectionData[0].top) {
          fromSection = sectionData[0].id
          toSection = sectionData[0].id
          newActiveSection = sectionData[0].id
          progress = 0
        } else if (scrollY >= sectionData[sectionData.length - 1].top) {
          // Past the last section
          const lastSection = sectionData[sectionData.length - 1]
          fromSection = lastSection.id
          toSection = lastSection.id
          newActiveSection = lastSection.id
          progress = 1
        } else {
          // Find which two sections we're between
          for (let i = 0; i < sectionData.length - 1; i++) {
            const current = sectionData[i]
            const next = sectionData[i + 1]

            if (scrollY >= current.top && scrollY < next.top) {
              fromSection = current.id
              toSection = next.id

              // Calculate progress based on section top positions
              const sectionDistance = next.top - current.top
              const scrolledDistance = scrollY - current.top
              progress = Math.max(0, Math.min(1, scrolledDistance / sectionDistance))

              // Set active section based on progress threshold
              newActiveSection = progress < 0.5 ? current.id : next.id

              break
            }
          }
        }

        // Update active section state if changed (compare via ref to avoid dependency)
        if (newActiveSection !== activeSectionRef.current) {
          setActiveSection(newActiveSection)
          onSectionChangeRef.current?.(newActiveSection)
        }

        // Update scroll data ref (no re-render)
        const fromConfig = sections.find(s => s.id === fromSection)
        const toConfig = sections.find(s => s.id === toSection)

        scrollDataRef.current = {
          fromSection,
          toSection,
          progress,
          fromDataCenter: fromConfig?.focusDataCenter,
          toDataCenter: toConfig?.focusDataCenter,
          fromZoom: fromConfig?.zoomLevel || 3,
          toZoom: toConfig?.zoomLevel || 3,
          fromLat: fromConfig?.focusDataCenter?.lat || 0,
          toLat: toConfig?.focusDataCenter?.lat || 0,
        }

        // Set timeout to mark scrolling as finished
        scrollTimeout = setTimeout(() => {
          setIsScrolling(false)
        }, 150)
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Initial calculation
    const timeoutId = setTimeout(handleScroll, 100)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      if (scrollTimeout !== null) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [sections])

  // Programmatically scroll to a section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (!element) return

    const offset = 80 // Account for navbar height
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset

    window.scrollTo({
      top: elementPosition - offset,
      behavior: 'smooth'
    })
  }, [])

  return {
    activeSection,
    scrollDataRef,
    scrollToSection,
    isScrolling,
    sections,
  }
}
