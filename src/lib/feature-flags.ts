import { env } from '@/env'

export const featureFlags = {
  caseStudies: env.VITE_FEATURE_CASE_STUDIES === 'true',
  technicalResources: env.VITE_FEATURE_TECHNICAL_RESOURCES === 'true',
  innovationLab: env.VITE_FEATURE_INNOVATION_LAB === 'true',
  chat: env.VITE_FEATURE_CHAT === 'true',
} as const
