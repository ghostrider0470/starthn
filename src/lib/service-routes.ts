export const SERVICE_IDS = [
  'bookkeeping',
  'taxConsulting',
  'virtualCfo',
  'businessConsulting',
  'financialReporting',
  'education',
] as const

export type ServiceId = (typeof SERVICE_IDS)[number]

export const SERVICE_ROUTES: Record<ServiceId, string> = {
  bookkeeping: '/services/bookkeeping-accounting',
  taxConsulting: '/services/tax-consulting',
  virtualCfo: '/services/virtual-cfo',
  businessConsulting: '/services/business-consulting',
  financialReporting: '/services/financial-reporting',
  education: '/services/education-courses',
}

export const LEGACY_SERVICE_REDIRECTS = {
  '/services/enterprise-software-development':
    SERVICE_ROUTES.bookkeeping,
  '/services/ai-ml-business-intelligence': SERVICE_ROUTES.taxConsulting,
  '/services/cloud-architecture': SERVICE_ROUTES.virtualCfo,
  '/services/iot-edge-computing': SERVICE_ROUTES.businessConsulting,
  '/services/devops-platform-engineering': SERVICE_ROUTES.financialReporting,
  '/services/digital-transformation': SERVICE_ROUTES.education,
} as const

export function getServiceRoute(serviceId: ServiceId): string {
  return SERVICE_ROUTES[serviceId]
}
