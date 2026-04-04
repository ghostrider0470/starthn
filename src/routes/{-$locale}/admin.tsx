import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import authService from '@/services/auth.service'
import { hasPermission } from '@/lib/rbac'
import { AdminNavbar } from '@/components/admin/AdminNavbar'
import { AdminBottomNav } from '@/components/admin/AdminBottomNav'

export const Route = createFileRoute('/{-$locale}/admin')({
  beforeLoad: ({ location }) => {
    // Require authentication
    if (!authService.isAuthenticated()) {
      throw redirect({
        to: '/login' as any,
        search: { redirect: location.pathname } as any,
        replace: true,
      })
    }

    // Require view:admin permission (derived from roles in JWT)
    const user = authService.getCurrentUser()
    const roles = user?.roles ?? []
    if (!hasPermission(roles, 'view:admin')) {
      throw redirect({
        to: '/' as any,
        replace: true,
      })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <AdminNavbar />
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
        <Outlet />
      </main>
      <AdminBottomNav />
    </div>
  )
}
