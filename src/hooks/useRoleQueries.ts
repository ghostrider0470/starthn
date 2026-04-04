import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roleService } from '@/services/role.service'
import type { CreateRoleDto, UpdateRoleDto } from '@/services/role.service'

export const roleKeys = {
  all: ['roles'] as const,
  public: () => [...roleKeys.all, 'public'] as const,
  admin: () => [...roleKeys.all, 'admin'] as const,
  permissions: () => [...roleKeys.all, 'permissions'] as const,
}

export function usePublicRoles() {
  return useQuery({
    queryKey: roleKeys.public(),
    queryFn: () => roleService.fetchPublicRoles(),
    staleTime: 60 * 60 * 1000,
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: roleKeys.permissions(),
    queryFn: () => roleService.fetchPermissions(),
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useAdminRoles() {
  return useQuery({
    queryKey: roleKeys.admin(),
    queryFn: () => roleService.fetchAdminRoles(),
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateRoleDto) => roleService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleDto }) =>
      roleService.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => roleService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
    },
  })
}
