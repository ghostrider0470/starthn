import { describe, expect, it } from 'vitest'
import { resolveRouteTemplatePath } from './route-template-guard'

describe('resolveRouteTemplatePath', () => {
  it('maps the URLs Search Console flagged to their real pages', () => {
    expect(resolveRouteTemplatePath('/{-$locale}/terms')).toBe('/bs-BA/terms')
    expect(
      resolveRouteTemplatePath('/%7B-%24locale%7D/services/business-consulting'),
    ).toBe('/bs-BA/services/business-consulting')
    expect(resolveRouteTemplatePath('/{-%24locale}/terms')).toBe('/bs-BA/terms')
    expect(resolveRouteTemplatePath('/{-$locale}')).toBe('/bs-BA')
  })

  it('handles required-param templates too', () => {
    expect(resolveRouteTemplatePath('/bs-BA/blog/{$slug}')).toBe('/bs-BA/blog')
  })

  it('leaves normal paths alone', () => {
    expect(resolveRouteTemplatePath('/')).toBeNull()
    expect(resolveRouteTemplatePath('/bs-BA/terms')).toBeNull()
    expect(resolveRouteTemplatePath('/en-US/blog/some-post')).toBeNull()
    expect(resolveRouteTemplatePath('/%E0%A4%A')).toBeNull()
  })
})
