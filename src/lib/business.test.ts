import { describe, expect, it } from 'vitest'
import {
  CONTACT_EMAIL,
  GOOGLE_BUSINESS_PROFILE_URL,
  OWNER_LINKEDIN_URL,
  PHONE_INTL,
  PHONE_TEL,
  SOCIAL_PROFILES,
} from './business'

describe('business constants', () => {
  it('lists only stable social profile URLs, never /share/ redirects', () => {
    for (const url of SOCIAL_PROFILES) {
      expect(url).not.toContain('/share/')
    }
  })

  it('keeps the personal LinkedIn out of the business social profiles', () => {
    const profiles: ReadonlyArray<string> = SOCIAL_PROFILES
    expect(profiles).not.toContain(OWNER_LINKEDIN_URL)
  })

  it('uses a digits-only tel: value', () => {
    expect(PHONE_TEL).toMatch(/^\+\d+$/)
  })

  it('keeps the international display phone in sync with the tel: value', () => {
    expect(PHONE_INTL.replace(/\s+/g, '')).toBe(PHONE_TEL)
  })

  it('uses a starthn.ba contact email', () => {
    expect(CONTACT_EMAIL.endsWith('@starthn.ba')).toBe(true)
  })

  it('points at the Google Business Profile listing', () => {
    expect(GOOGLE_BUSINESS_PROFILE_URL).toContain('cid=6152645102359996777')
  })
})
