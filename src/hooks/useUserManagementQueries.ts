import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userManagementService } from '@/services/user-management.service'

export const userManagementKeys = {
  all: ['admin-users'] as const,
  list: (params?: { search?: string; role?: string; page?: number; pageSize?: number }) =>
    [...userManagementKeys.all, 'list', params] as const,
}

export function useAdminUsers(params?: { search?: string; role?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: userManagementKeys.list(params),
    queryFn: () => userManagementService.fetchUsers(params),
  })
}

export function useUpdateUserRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) =>
      userManagementService.updateRoles(id, roles),
    onSuccess: () => qc.invalidateQueries({ queryKey: userManagementKeys.all }),
  })
}

export function useUpdateUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      userManagementService.updateStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: userManagementKeys.all }),
  })
}
