import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import caseStudyService from '@/services/case-study.service'
import type {
  CreateCaseStudyDto,
  UpdateCaseStudyDto,
} from '@/services/case-study.service'

// Query keys
export const caseStudyKeys = {
  all: ['case-studies'] as const,
  list: () => [...caseStudyKeys.all, 'list'] as const,
  detail: (slug: string) => [...caseStudyKeys.all, 'detail', slug] as const,
  admin: () => [...caseStudyKeys.all, 'admin'] as const,
  adminList: () => [...caseStudyKeys.admin(), 'list'] as const,
}

// Public hooks

export function useCaseStudies() {
  return useQuery({
    queryKey: caseStudyKeys.list(),
    queryFn: () => caseStudyService.fetchCaseStudies(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
  })
}

export function useCaseStudy(slug: string) {
  return useQuery({
    queryKey: caseStudyKeys.detail(slug),
    queryFn: () => caseStudyService.fetchCaseStudyBySlug(slug),
    enabled: !!slug,
  })
}

// Admin hooks

export function useAdminCaseStudies() {
  return useQuery({
    queryKey: caseStudyKeys.adminList(),
    queryFn: () => caseStudyService.fetchAdminCaseStudies(),
  })
}

export function useCreateCaseStudy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCaseStudyDto) => caseStudyService.createCaseStudy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseStudyKeys.all })
    },
  })
}

export function useUpdateCaseStudy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      slug,
      data,
    }: {
      slug: string
      data: UpdateCaseStudyDto
    }) => caseStudyService.updateCaseStudy(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseStudyKeys.all })
    },
  })
}

export function useDeleteCaseStudy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => caseStudyService.deleteCaseStudy(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseStudyKeys.all })
    },
  })
}

export function useSeedCaseStudies() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (items: CreateCaseStudyDto[]) =>
      caseStudyService.seedCaseStudies(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseStudyKeys.all })
    },
  })
}
