import { Navigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'
import { ReactNode } from 'react'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: string[]
  requiredPermissions?: string[]
  requireAny?: boolean // If true, user needs ANY of the roles/permissions. If false, needs ALL.
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  requireAny = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, hasPermission, isLoading } = useAuth()
  const currentLocale = getLocaleFromPath(window.location.pathname)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={withLocalePath('/login', currentLocale)} />
  }

  // Check roles
  if (requiredRoles.length > 0) {
    const hasRequiredRoles = requireAny
      ? requiredRoles.some((role) => hasRole(role))
      : requiredRoles.every((role) => hasRole(role))

    if (!hasRequiredRoles) {
      return <Navigate to={withLocalePath('/unauthorized', currentLocale)} />
    }
  }

  // Check permissions
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAny
      ? requiredPermissions.some((permission) => hasPermission(permission))
      : requiredPermissions.every((permission) => hasPermission(permission))

    if (!hasRequiredPermissions) {
      return <Navigate to={withLocalePath('/unauthorized', currentLocale)} />
    }
  }

  return <>{children}</>
}
