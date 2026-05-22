import { describe, expect, it } from 'vitest'
import {
  LEGACY_SERVICE_REDIRECTS,
  SERVICE_IDS,
  SERVICE_ROUTES,
} from './service-routes'

describe('service route registry', () => {
  it('exposes six accounting service routes', () => {
    expect(SERVICE_IDS).toEqual([
      'bookkeeping',
      'taxConsulting',
      'virtualCfo',
      'businessConsulting',
      'financialReporting',
      'education',
    ])

    expect(Object.values(SERVICE_ROUTES)).toEqual([
      '/services/bookkeeping-accounting',
      '/services/tax-consulting',
      '/services/virtual-cfo',
      '/services/business-consulting',
      '/services/financial-reporting',
      '/services/education-courses',
    ])
  })

  it('keeps old Horizon service URLs as redirects only', () => {
    expect(LEGACY_SERVICE_REDIRECTS).toMatchObject({
      '/services/enterprise-software-development':
        '/services/bookkeeping-accounting',
      '/services/ai-ml-business-intelligence': '/services/tax-consulting',
      '/services/cloud-architecture': '/services/virtual-cfo',
      '/services/iot-edge-computing': '/services/business-consulting',
      '/services/devops-platform-engineering': '/services/financial-reporting',
      '/services/digital-transformation': '/services/education-courses',
    })

    for (const route of Object.values(SERVICE_ROUTES)) {
      expect(route).not.toMatch(
        /enterprise-software|ai-ml|cloud-architecture|iot-edge|devops|digital-transformation/,
      )
    }
  })
})
