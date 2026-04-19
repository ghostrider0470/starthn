interface LandingPageLayoutProps {
  children: React.ReactNode
}

export function LandingPageLayout({ children }: LandingPageLayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="relative z-10">{children}</div>
    </div>
  )
}
