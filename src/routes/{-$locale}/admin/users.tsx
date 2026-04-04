import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { useAdminUsers, useUpdateUserRoles, useUpdateUserStatus } from '@/hooks/useUserManagementQueries'
import type { AdminUser } from '@/services/user-management.service'
import { ROLES, ROLE_LABELS, ROLE_VARIANTS } from '@/lib/rbac'
import { useAdminRoles } from '@/hooks/useRoleQueries'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, Loader2, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/admin/users')({
  component: AdminUsersPage,
})

const PAGE_SIZE = 20

// ── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ user, size = 'sm' }: { user: AdminUser; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'h-12 w-12 text-lg' : 'h-8 w-8 text-xs'
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?'

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${user.firstName} ${user.lastName}`}
        className={cn('rounded-full object-cover shrink-0', dim)}
      />
    )
  }

  return (
    <div className={cn('rounded-full bg-muted flex items-center justify-center font-medium shrink-0', dim)}>
      {initials}
    </div>
  )
}

// ── Edit dialog ──────────────────────────────────────────────────────────────

function EditUserDialog({
  user: editingUser,
  currentUserId,
  roleNames,
  onClose,
  onSave,
  isSaving,
}: {
  user: AdminUser
  currentUserId: string
  roleNames: string[]
  onClose: () => void
  onSave: (roles: string[], isActive: boolean) => void
  isSaving: boolean
}) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(editingUser.roles)
  const [isActive, setIsActive] = useState(editingUser.isActive)

  const isSelf = currentUserId === editingUser.id

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* User info (read-only) */}
          <div className="flex items-center gap-3">
            <UserAvatar user={editingUser} size="lg" />
            <div className="min-w-0">
              <p className="font-medium truncate">
                {editingUser.firstName} {editingUser.lastName}
              </p>
              <p className="text-sm text-muted-foreground truncate">{editingUser.email}</p>
            </div>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Roles</label>
            <div className="space-y-1.5">
              {roleNames.map((role) => {
                const isMasterAdminSelf =
                  isSelf && editingUser.roles.includes('MasterAdmin') && role === 'MasterAdmin'
                return (
                  <label
                    key={role}
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      isMasterAdminSelf && 'opacity-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      disabled={isMasterAdminSelf}
                      onChange={() => toggleRole(role)}
                      className="rounded"
                    />
                    <span>{ROLE_LABELS[role] ?? role}</span>
                    {isMasterAdminSelf && (
                      <span className="text-xs text-muted-foreground">(cannot remove own)</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Active toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded"
              />
              <span>Active</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(selectedRoles, isActive)} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

function AdminUsersPage() {
  const { user } = useAuth()
  const currentUserId = user?.id ?? ''
  const { data: dbRoles } = useAdminRoles()
  const roleNames = dbRoles?.map((r) => r.name) ?? [...ROLES]

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('__all__')
  const [page, setPage] = useState(1)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page when role filter changes
  useEffect(() => {
    setPage(1)
  }, [roleFilter])

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      role: roleFilter === '__all__' ? undefined : roleFilter,
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, roleFilter, page],
  )

  const { data, isLoading } = useAdminUsers(queryParams)
  const updateRolesMutation = useUpdateUserRoles()
  const updateStatusMutation = useUpdateUserStatus()

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  async function handleSave(roles: string[], isActive: boolean) {
    if (!editingUser) return

    const rolesChanged =
      roles.length !== editingUser.roles.length ||
      roles.some((r) => !editingUser.roles.includes(r))
    const statusChanged = isActive !== editingUser.isActive

    if (rolesChanged) {
      await updateRolesMutation.mutateAsync({ id: editingUser.id, roles })
    }
    if (statusChanged) {
      await updateStatusMutation.mutateAsync({ id: editingUser.id, isActive })
    }

    setEditingUser(null)
  }

  const isSaving = updateRolesMutation.isPending || updateStatusMutation.isPending

  return (
    <div className="py-6 lg:py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage user roles and account status.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Roles</SelectItem>
            {roleNames.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role] ?? role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users
            {data && <Badge variant="secondary" className="ml-2">{total}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No users found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserAvatar user={u} />
                            <span className="font-medium whitespace-nowrap">
                              {u.firstName} {u.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={
                                  (ROLE_VARIANTS[role] as 'default' | 'secondary' | 'destructive' | 'outline') ??
                                  'outline'
                                }
                              >
                                {ROLE_LABELS[role] ?? role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? 'success' : 'outline'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUser(u)}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <EditUserDialog
          key={editingUser.id}
          user={editingUser}
          currentUserId={currentUserId}
          roleNames={roleNames}
          onClose={() => setEditingUser(null)}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
