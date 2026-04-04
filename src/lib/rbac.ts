export const ROLES = ['MasterAdmin', 'Admin', 'Editor', 'Author', 'Member', 'User'] as const
export type Role = (typeof ROLES)[number]

// Legacy roles that map to new ones
export const ALL_ROLES = [...ROLES, 'Owner', 'Employee', 'Individual'] as const

const FALLBACK_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  MasterAdmin: ['*'],
  Admin: ['view:admin', 'manage:users', 'manage:roles', 'manage:blog', 'manage:categories', 'manage:tags', 'manage:case-studies', 'manage:pages'],
  Editor: ['view:admin', 'manage:blog', 'manage:case-studies', 'manage:categories', 'manage:tags'],
  Author: ['view:admin', 'manage:blog:own'],
  Member: ['manage:pages'],
  User: [],
  // Legacy
  Owner: ['view:admin', 'manage:users', 'manage:roles', 'manage:blog', 'manage:categories', 'manage:tags', 'manage:case-studies', 'manage:pages'],
  Employee: ['manage:pages'],
  Individual: [],
}

// Dynamic override — set when admin roles load from API
let _dynamicRolePermissions: Record<string, readonly string[]> | null = null

export function setRolePermissions(map: Record<string, string[]>) {
  _dynamicRolePermissions = map
}

export function getPermissionsForRoles(roles: string[]): Set<string> {
  const source = _dynamicRolePermissions ?? FALLBACK_ROLE_PERMISSIONS
  const perms = new Set<string>()
  for (const role of roles) {
    const rolePerms = source[role]
    if (rolePerms) {
      for (const p of rolePerms) perms.add(p)
    }
  }
  return perms
}

export function hasPermission(roles: string[], permission: string): boolean {
  const perms = getPermissionsForRoles(roles)
  if (perms.has('*')) return true
  if (perms.has(permission)) return true
  // Hierarchy: manage:blog includes manage:blog:own
  const lastColon = permission.lastIndexOf(':')
  if (lastColon > 0) {
    const parent = permission.slice(0, lastColon)
    if (perms.has(parent)) return true
  }
  return false
}

export function hasAnyPermission(roles: string[], permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(roles, p))
}

/** Human-readable labels for roles */
export const ROLE_LABELS: Record<string, string> = {
  MasterAdmin: 'Master Admin',
  Admin: 'Admin',
  Editor: 'Editor',
  Author: 'Author',
  Member: 'Member',
  User: 'User',
  Owner: 'Owner',
  Employee: 'Employee',
  Individual: 'Individual',
}

/** Badge variant for each role */
export const ROLE_VARIANTS: Record<string, string> = {
  MasterAdmin: 'destructive',
  Admin: 'default',
  Editor: 'default',
  Author: 'secondary',
  Member: 'secondary',
  User: 'outline',
  Owner: 'default',
  Employee: 'secondary',
  Individual: 'outline',
}
