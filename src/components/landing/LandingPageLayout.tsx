/**
 * Landing page layout — clean professional wrapper
 */

interface LandingPageLayoutProps {
  children: React.ReactNode
}

export function LandingPageLayout({ children }: LandingPageLayoutProps) {
  return (
    <div className="relative min-h-screen">
      {/* Subtle ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,107,53,0.06),transparent_42%),radial-gradient(circle_at_85%_12%,rgba(168,85,247,0.04),transparent_40%)]" />
      </div>

      {/* Main content */}
      <div className="relative z-20">
        {children}
      </div>
    </div>
  )
}
