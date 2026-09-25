/**
 * Business identity constants — the single source of truth for Start HN's
 * name, address, phone (NAP), identifiers and official profiles.
 *
 * These values must match the Google Business Profile exactly; Maps ranking
 * leans on NAP consistency across the site, structured data and citations.
 *
 * Keep this module free of imports from '@/lib/seo' so that seo.ts can
 * import from it without a cycle.
 */

/** Public brand / site name. */
export const BRAND = 'Start HN'

/** Name as listed on the Google Business Profile (use as alternateName). */
export const GBP_NAME = 'Računovodstvena Agencija START HN'

/** Registered legal name. */
export const LEGAL_NAME = 'Računovodstvena agencija START HN d.o.o.'

// Address — never translated or transliterated.
export const STREET = 'Ibrahima Ljubovića 47'
export const POSTAL_CODE = '71210'
export const LOCALITY = 'Ilidža'
export const REGION = 'Kanton Sarajevo'
export const COUNTRY = 'BA'

// Phone — the only current number.
export const PHONE_DISPLAY = '061 221 368'
export const PHONE_INTL = '+387 61 221 368'
/** For tel: links — digits only after the leading '+'. */
export const PHONE_TEL = '+38761221368'

/** Single public contact email (owner decision D2: klijenti@ replaces info@). */
export const CONTACT_EMAIL = 'klijenti@starthn.ba'

export const OPENING_HOURS_DISPLAY = 'Pon–Pet 08:00–16:00'

// Registration and licences.
export const ID_BROJ = '4203402150001'
export const MBS = '65-01-1010-24'
export const FMF_LICENCE = 'UP-04-11-2-6-1516/24'
/**
 * SRR FBiH certified-accountant licence and its register. Not shown on the
 * site until the owner confirms the licence is current (the register row
 * lists 08.01.2026 and another firm).
 */
export const SRR_LICENCE = 'CR-6093/5'
export const SRR_REGISTER_URL = 'https://www.srr-fbih.org/clanovi-saveza-cr'

// Google Business Profile.
export const GOOGLE_BUSINESS_PROFILE_URL =
  'https://maps.google.com/?cid=6152645102359996777'
/** Google Maps place ID of the GBP listing (review and directions links). */
export const GBP_PLACE_ID = 'ChIJefqxuz7JWEcRaek2Wx-WYlU'
export const GBP_WRITE_REVIEW_URL = `https://search.google.com/local/writereview?placeid=${GBP_PLACE_ID}`
/**
 * Google Maps directions to the office (a plain link: nothing from Google
 * loads on the site before the visitor clicks it).
 */
export const GBP_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=Ibrahima+Ljubovi%C4%87a+47,+71210+Ilid%C5%BEa&destination_place_id=${GBP_PLACE_ID}`

/**
 * Google rating as shown on the GBP. Visible text only: never emit it as
 * AggregateRating (self-serving third-party review markup is against Google's
 * policy). Last checked 2026-09-25 — update both numbers by hand after a
 * re-check of the profile.
 */
export const GOOGLE_RATING = 5.0
export const GOOGLE_REVIEW_COUNT = 19
export const GOOGLE_RATING_CHECKED_ON = '2026-09-25'

/** Site locales that write a decimal comma ("5,0"). */
const DECIMAL_COMMA_LANGUAGES = new Set([
  'bs',
  'hr',
  'sr',
  'de',
  'es',
  'fr',
  'it',
  'nl',
  'pt',
  'ru',
  'tr',
])

/**
 * "5,0" / "5.0": the rating with one decimal for the page's locale. Plain
 * string formatting, not Intl: server (Workers) and browser must produce the
 * same text for hydration, whatever locale data each runtime ships.
 */
export function formatRating(rating: number, locale: string): string {
  const fixed = rating.toFixed(1)
  const language = locale.split('-')[0].toLowerCase()
  return DECIMAL_COMMA_LANGUAGES.has(language) ? fixed.replace('.', ',') : fixed
}

// Social profiles. Use the stable profile URLs, not /share/ tracking redirects.
export const FACEBOOK_PROFILE_URL =
  'https://www.facebook.com/profile.php?id=100086643588042'
export const INSTAGRAM_URL = 'https://www.instagram.com/racunovodstvo_starthn/'
/** The owner's personal profile — not a business profile. */
export const OWNER_LINKEDIN_URL =
  'https://www.linkedin.com/in/selma-had%C5%BEi%C4%87-150907323'

/**
 * Business-owned profiles only (for structured-data sameAs). The owner's
 * personal LinkedIn must NOT be listed here.
 */
export const SOCIAL_PROFILES = [FACEBOOK_PROFILE_URL, INSTAGRAM_URL] as const
