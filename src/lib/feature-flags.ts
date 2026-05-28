import { env } from '@/env'

export const featureFlags = {
  caseStudies: env.VITE_FEATURE_CASE_STUDIES === 'true',
  technicalResources: env.VITE_FEATURE_TECHNICAL_RESOURCES === 'true',
  chat: env.VITE_FEATURE_CHAT === 'true',
} as const
