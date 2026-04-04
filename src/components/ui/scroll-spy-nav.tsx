import { cn } from '@/lib/utils'
import type { SectionConfig } from '@/hooks/useScrollSections'

interface ScrollSpyNavProps {
  activeSection: string
  scrollToSection: (id: string) => void
  sections: SectionConfig[]
  isScrolling?: boolean
}

export function ScrollSpyNav({ activeSection, scrollToSection, sections, isScrolling }: ScrollSpyNavProps) {
  return (
    <nav className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
      <div className="flex flex-col gap-4">
        {sections.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollToSection(id)}
            className={cn(
              "group relative flex items-center gap-3 transition-all duration-300",
              "hover:scale-110"
            )}
            aria-label={`Navigate to ${label}`}
          >
            {/* Dot indicator */}
            <div className="relative">
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 transition-all duration-300",
                  activeSection === id
                    ? "bg-primary border-primary scale-125"
                    : "bg-background border-muted-foreground/30 hover:border-primary/50"
                )}
              />
              {/* Active pulse effect */}
              {activeSection === id && (
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-primary/30 animate-ping" />
              )}
            </div>

            {/* Label tooltip */}
            <span
              className={cn(
                "absolute right-6 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium",
                "transition-all duration-300 pointer-events-none",
                "bg-background/95 backdrop-blur-sm border shadow-lg",
                activeSection === id
                  ? "opacity-100 translate-x-0 border-primary text-primary"
                  : "opacity-0 translate-x-2 border-border text-muted-foreground group-hover:opacity-100 group-hover:translate-x-0"
              )}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}