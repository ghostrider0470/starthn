import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  useAdminRoles,
  usePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from '@/hooks/useRoleQueries'
import type { Role, CreateRoleDto, UpdateRoleDto } from '@/services/role.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Shield, Loader2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/admin/roles')({
  component: AdminRolesPage,
})

// ── Permission checkboxes ────────────────────────────────────────────────────

function PermissionCheckboxes({
  permissionGroups,
  selected,
  onChange,
  disabled,
}: {
  permissionGroups: Record<string, string[]>
  selected: string[]
  onChange: (permissions: string[]) => void
  disabled?: boolean
}) {
  function toggle(perm: string) {
    onChange(
      selected.includes(perm)
        ? selected.filter((p) => p !== perm)
        : [...selected, perm],
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(permissionGroups).map(([category, perms]) => {
        // Filter out wildcard — MasterAdmin-only
        const visible = perms.filter((p) => p !== '*')
        if (visible.length === 0) return null
        return (
          <div key={category} className="space-y-1.5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {category}
            </p>
            <div className="space-y-1">
              {visible.map((perm) => (
                <label
                  key={perm}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    disabled && 'opacity-50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(perm)}
                    disabled={disabled}
                    onChange={() => toggle(perm)}
                    className="rounded"
                  />
                  <span className="font-mono text-xs">{perm}</span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Create dialog ────────────────────────────────────────────────────────────

function CreateRoleDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  permissionGroups,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateRoleDto) => void
  isPending: boolean
  permissionGroups: Record<string, string[]>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])

  function handleClose() {
    setName('')
    setDescription('')
    setPermissions([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Role</DialogTitle>
          <DialogDescription>
            Create a new role with specific permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Moderator"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What can this role do?"
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Permissions</label>
            <PermissionCheckboxes
              permissionGroups={permissionGroups}
              selected={permissions}
              onChange={setPermissions}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit({ name, description, permissions })}
            disabled={isPending || !name.trim()}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit dialog ──────────────────────────────────────────────────────────────

function EditRoleDialog({
  role,
  onClose,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
  permissionGroups,
}: {
  role: Role
  onClose: () => void
  onSave: (data: UpdateRoleDto) => void
  onDelete: () => void
  isSaving: boolean
  isDeleting: boolean
  permissionGroups: Record<string, string[]>
}) {
  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description)
  const [permissions, setPermissions] = useState<string[]>(role.permissions)

  const isMasterAdmin = role.name === 'MasterAdmin'

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Role
            {role.isSystem && (
              <Badge variant="outline" className="text-xs">
                <Lock className="mr-1 h-3 w-3" />
                System
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {isMasterAdmin && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
              System role — wildcard permission cannot be modified.
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={role.isSystem}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30',
                role.isSystem && 'opacity-50',
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Permissions</label>
            <PermissionCheckboxes
              permissionGroups={permissionGroups}
              selected={permissions}
              onChange={setPermissions}
              disabled={isMasterAdmin}
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <div className="flex w-full items-center justify-between">
            <div>
              {!role.isSystem && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  disabled={isDeleting}
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => onSave({ name, description, permissions })}
                disabled={isSaving || !name.trim()}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

function AdminRolesPage() {
  const { data: roles, isLoading } = useAdminRoles()
  const { data: permissionGroups } = usePermissions()
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()
  const deleteMutation = useDeleteRole()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)

  async function handleCreate(data: CreateRoleDto) {
    await createMutation.mutateAsync(data)
    setCreateOpen(false)
  }

  async function handleSave(data: UpdateRoleDto) {
    if (!editingRole) return
    await updateMutation.mutateAsync({ id: editingRole.id, data })
    setEditingRole(null)
  }

  async function handleDeleteFromEdit() {
    if (!editingRole) return
    await deleteMutation.mutateAsync(editingRole.id)
    setEditingRole(null)
  }

  async function handleDelete() {
    if (!deletingRole) return
    await deleteMutation.mutateAsync(deletingRole.id)
    setDeletingRole(null)
  }

  return (
    <div className="py-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage roles with fine-grained permissions.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Roles
            {roles && (
              <Badge variant="secondary" className="ml-2">
                {roles.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !roles || roles.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No roles yet.</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Role
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {role.description || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="tabular-nums">
                          {role.permissions.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {role.isSystem && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="mr-1 h-3 w-3" />
                            System
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRole(role)}
                            title="Edit role"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingRole(role)}
                            disabled={role.isSystem}
                            title={role.isSystem ? 'System roles cannot be deleted' : 'Delete role'}
                          >
                            <Trash2
                              className={cn(
                                'h-4 w-4',
                                role.isSystem ? 'text-muted-foreground/40' : 'text-destructive',
                              )}
                            />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRoleDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        permissionGroups={permissionGroups ?? {}}
      />

      {editingRole && (
        <EditRoleDialog
          key={editingRole.id}
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSave={handleSave}
          onDelete={handleDeleteFromEdit}
          isSaving={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
          permissionGroups={permissionGroups ?? {}}
        />
      )}

      <Dialog open={!!deletingRole} onOpenChange={(v) => !v && setDeletingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this role?</DialogTitle>
            <DialogDescription>
              Delete role &ldquo;{deletingRole?.name}&rdquo;? Users with this role will lose its
              permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRole(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
