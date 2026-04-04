interface PageTransitionProps {
  children: React.ReactNode
  routeKey: string
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={className}>{children}</div>
}
