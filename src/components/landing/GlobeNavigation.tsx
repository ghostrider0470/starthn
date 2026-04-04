/**
 * Unified globe navigation component
 * Combines 3D globe visualization with interactive scroll navigation
 */

import { Suspense, lazy } from 'react'
import { cn } from '@/lib/utils'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { useTranslation } from 'react-i18next'
import type { SectionConfig, ScrollData } from '@/hooks/useScrollSections'

const GlobeVisualization = lazy(() =>
  import('@/components/globe/GlobeVisualization').then((module) => ({
    default: module.GlobeVisualization,
  })),
)

interface GlobeNavigationProps {
  scrollDataRef: React.MutableRefObject<ScrollData>
  activeSection: string
  scrollToSection: (id: string) => void
  sections: SectionConfig[]
  isScrolling?: boolean
}

export function GlobeNavigation({
  scrollDataRef,
  activeSection,
  scrollToSection,
  sections,
  isScrolling
}: GlobeNavigationProps) {
  const layout = useResponsiveLayout()
  const { t } = useTranslation()

  // Don't render if globe shouldn't be visible
  if (!layout.globeVisible) {
    return null
  }

  const initialDataCenter = scrollDataRef?.current?.fromDataCenter

  return (
    <div className="fixed right-0 top-24 z-[25] hidden lg:flex items-start justify-end pointer-events-none h-[calc(100vh-12rem)] max-h-[900px]">
      {/* Container for globe and navigation */}
      <div className="relative h-full flex items-center justify-end py-8">
        {/* Globe visualization */}
        <div className="w-[800px] h-full max-h-[650px] pointer-events-auto">
          <Suspense fallback={<div className="h-full w-full animate-pulse rounded-full bg-primary/5" />}>
            <GlobeVisualization
              fromDataCenter={initialDataCenter}
              toDataCenter={initialDataCenter}
              scrollProgress={0}
              scrollDataRef={scrollDataRef}
              currentSection={scrollDataRef?.current?.fromSection || 'hero'}
            />
          </Suspense>
        </div>

        {/* Navigation overlay on top of globe */}
        <nav className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-auto z-10">
          <div className="flex flex-col gap-3.5">
            {sections.map(({ id, label, focusDataCenter }, index) => {
              const isActive = activeSection === id

              return (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={cn(
                    "group relative transition-all duration-500 ease-out",
                    isActive ? "scale-105" : "hover:scale-105"
                  )}
                  aria-label={t('sideNav.navigateTo', { section: label })}
                >
                  {/* Glowing background effect */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl animate-pulse" />
                  )}

                  {/* Connection line to globe */}
                  <div
                    className={cn(
                      "absolute right-full mr-2 top-1/2 -translate-y-1/2",
                      "h-px transition-all duration-700 ease-out",
                      isActive
                        ? "w-16 bg-gradient-to-l from-primary/60 via-primary/40 to-transparent"
                        : "w-8 bg-gradient-to-l from-border/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:w-12"
                    )}
                  />

                  {/* Main card */}
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-xl",
                      "transition-all duration-500",
                      "backdrop-blur-xl border",
                      isActive
                        ? "bg-gradient-to-br from-primary/15 via-primary/10 to-background/80 border-primary/60 shadow-xl shadow-primary/25"
                        : "bg-gradient-to-br from-background/90 to-background/70 border-border/40 shadow-lg hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
                    )}
                  >
                    {/* Inner glow */}
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-500",
                        isActive ? "opacity-100" : "group-hover:opacity-50"
                      )}
                    />

                    {/* Content */}
                    <div className="relative flex items-center gap-3 px-3 py-2.5 min-w-[160px]">
                      {/* Left: Number & Dot */}
                      <div className="flex flex-col items-center gap-1.5">
                        {/* Section number */}
                        <span
                          className={cn(
                            "text-[10px] font-bold tabular-nums transition-all duration-300",
                            isActive
                              ? "text-primary scale-110"
                              : "text-muted-foreground/60 group-hover:text-muted-foreground"
                          )}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        {/* Animated dot */}
                        <div className="relative flex items-center justify-center">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full transition-all duration-300",
                              isActive
                                ? "bg-primary shadow-lg shadow-primary/60 scale-125"
                                : "bg-muted-foreground/30 group-hover:bg-primary/60 group-hover:scale-110"
                            )}
                          />
                          {/* Double pulse for active */}
                          {isActive && (
                            <>
                              <div className="absolute inset-0 w-2 h-2 rounded-full bg-primary/40 animate-ping" />
                              <div className="absolute inset-0 w-2 h-2 rounded-full bg-primary/20 animate-ping animation-delay-150" />
                            </>
                          )}
                        </div>

                        {/* Vertical line connector */}
                        <div
                          className={cn(
                            "w-px h-5 transition-all duration-500",
                            isActive
                              ? "bg-gradient-to-b from-primary/60 to-transparent"
                              : "bg-gradient-to-b from-border/30 to-transparent group-hover:from-primary/40"
                          )}
                        />
                      </div>

                      {/* Right: Labels */}
                      <div className="flex-1 flex flex-col gap-1">
                        {/* Section label */}
                        <span
                          className={cn(
                            "text-sm font-bold tracking-tight transition-colors duration-300",
                            isActive
                              ? "text-primary"
                              : "text-foreground group-hover:text-primary"
                          )}
                        >
                          {label}
                        </span>

                        {/* City name with icon */}
                        {focusDataCenter && (
                          <div className="flex items-center gap-1">
                            <svg
                              className={cn(
                                "w-2.5 h-2.5 transition-colors duration-300",
                                isActive
                                  ? "text-primary/70"
                                  : "text-muted-foreground/50 group-hover:text-muted-foreground"
                              )}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span
                              className={cn(
                                "text-[10px] font-medium tracking-wide transition-colors duration-300",
                                isActive
                                  ? "text-primary/80"
                                  : "text-muted-foreground/70 group-hover:text-muted-foreground"
                              )}
                            >
                              {focusDataCenter.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right edge accent */}
                      <div
                        className={cn(
                          "absolute right-0 top-0 bottom-0 w-1 transition-all duration-500",
                          isActive
                            ? "bg-gradient-to-b from-primary via-primary/60 to-primary/20"
                            : "bg-gradient-to-b from-transparent via-border/20 to-transparent group-hover:from-primary/40 group-hover:via-primary/20"
                        )}
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Enhanced progress indicator */}
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <div className="relative w-32 h-1 bg-border/20 rounded-full overflow-hidden">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />

              {/* Progress bar */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-700 ease-out shadow-lg shadow-primary/30"
                style={{
                  width: `${((sections.findIndex(s => s.id === activeSection) + 1) / sections.length) * 100}%`
                }}
              />
            </div>

            {/* Progress text */}
            <span className="text-[10px] font-medium text-muted-foreground/60">
              {sections.findIndex(s => s.id === activeSection) + 1} / {sections.length}
            </span>
          </div>
        </nav>
      </div>
    </div>
  )
}
