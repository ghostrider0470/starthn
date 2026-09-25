import { describe, expect, it } from 'vitest'
import {
  SERVICE_DETAIL_SECTION_IDS,
  SERVICE_IDS,
  SERVICE_INDEX_SECTION_IDS,
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

  it('never routes to the old software-template service slugs (those 404)', () => {
    for (const route of Object.values(SERVICE_ROUTES)) {
      expect(route).not.toMatch(
        /enterprise-software|ai-ml|cloud-architecture|iot-edge|devops|digital-transformation/,
      )
    }
  })

  it('uses dense slideshow sections for services pages', () => {
    expect(SERVICE_INDEX_SECTION_IDS).toEqual(['overview', 'services', 'start'])
    expect(SERVICE_DETAIL_SECTION_IDS).toEqual([
      'overview',
      'scope',
      'process',
      'deliverables',
    ])
  })
})
