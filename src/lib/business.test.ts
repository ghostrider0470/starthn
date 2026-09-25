import { describe, expect, it } from 'vitest'
import {
  CONTACT_EMAIL,
  GBP_DIRECTIONS_URL,
  GBP_PLACE_ID,
  GBP_WRITE_REVIEW_URL,
  GOOGLE_BUSINESS_PROFILE_URL,
  GOOGLE_RATING,
  GOOGLE_RATING_CHECKED_ON,
  GOOGLE_REVIEW_COUNT,
  ID_BROJ,
  LEGAL_NAME,
  LOCALITY,
  MBS,
  OWNER_LINKEDIN_URL,
  PHONE_INTL,
  PHONE_TEL,
  POSTAL_CODE,
  SOCIAL_PROFILES,
  STREET,
  formatRating,
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

  it('builds the review and directions links from the GBP place ID', () => {
    expect(GBP_PLACE_ID).toBe('ChIJefqxuz7JWEcRaek2Wx-WYlU')
    expect(GBP_WRITE_REVIEW_URL).toBe(
      'https://search.google.com/local/writereview?placeid=ChIJefqxuz7JWEcRaek2Wx-WYlU',
    )
    const directions = new URL(GBP_DIRECTIONS_URL)
    expect(directions.origin + directions.pathname).toBe(
      'https://www.google.com/maps/dir/',
    )
    expect(directions.searchParams.get('api')).toBe('1')
    expect(directions.searchParams.get('destination')).toBe(
      `${STREET}, ${POSTAL_CODE} ${LOCALITY}`,
    )
    expect(directions.searchParams.get('destination_place_id')).toBe(
      GBP_PLACE_ID,
    )
  })

  it('keeps the Google rating plausible (visible text only)', () => {
    expect(GOOGLE_RATING).toBeGreaterThanOrEqual(1)
    expect(GOOGLE_RATING).toBeLessThanOrEqual(5)
    expect(Number.isInteger(GOOGLE_REVIEW_COUNT)).toBe(true)
    expect(GOOGLE_REVIEW_COUNT).toBeGreaterThan(0)
    expect(GOOGLE_RATING_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('formats the rating with one decimal in the page locale', () => {
    expect(formatRating(5, 'bs-BA')).toBe('5,0')
    expect(formatRating(5, 'hr-HR')).toBe('5,0')
    expect(formatRating(5, 'en-US')).toBe('5.0')
    expect(formatRating(4.86, 'en-US')).toBe('4.9')
    expect(formatRating(5, 'de-DE')).toBe('5,0')
    expect(formatRating(5, 'sr-Latn')).toBe('5,0')
    expect(formatRating(5, 'ja-JP')).toBe('5.0')
    // An unknown tag must not throw during render.
    expect(formatRating(5, 'not a locale!')).toBe('5.0')
    expect(formatRating(5, '')).toBe('5.0')
  })

  it('keeps the legal identifiers in their register formats', () => {
    expect(LEGAL_NAME).toBe('Računovodstvena agencija START HN d.o.o.')
    expect(ID_BROJ).toMatch(/^\d{13}$/)
    expect(MBS).toMatch(/^\d{2}-\d{2}-\d{4}-\d{2}$/)
  })
})
