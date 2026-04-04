import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { llmService } from '@/services/llm.service'
import type { CreateLlmProviderDto, UpdateLlmProviderDto, UpdateLlmSettingsDto } from '@/services/llm.service'

export const llmKeys = {
  all: ['llm'] as const,
  providers: () => [...llmKeys.all, 'providers'] as const,
  settings: () => [...llmKeys.all, 'settings'] as const,
}

export function useLlmProviders() {
  return useQuery({
    queryKey: llmKeys.providers(),
    queryFn: () => llmService.fetchProviders(),
  })
}

export function useLlmSettings() {
  return useQuery({
    queryKey: llmKeys.settings(),
    queryFn: () => llmService.fetchSettings(),
  })
}

export function useCreateLlmProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLlmProviderDto) => llmService.createProvider(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: llmKeys.all }),
  })
}

export function useUpdateLlmProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: UpdateLlmProviderDto }) =>
      llmService.updateProvider(key, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: llmKeys.all }),
  })
}

export function useDeleteLlmProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => llmService.deleteProvider(key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: llmKeys.all }),
  })
}

export function useUpdateLlmSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateLlmSettingsDto) => llmService.updateSettings(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: llmKeys.all }),
  })
}
