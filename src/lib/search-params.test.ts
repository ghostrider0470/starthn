import { describe, expect, it } from 'vitest'
import {
  parseBlogSearch,
  parseConfirmEmailSearch,
  parseOAuthCallbackSearch,
  parseResetPasswordSearch,
  searchEmail,
  searchPositiveInt,
  searchString,
} from './search-params'

describe('searchString', () => {
  it('keeps strings and writes JSON-parsed numbers and booleans back as text', () => {
    expect(searchString('porez')).toBe('porez')
    expect(searchString('')).toBe('')
    // TanStack Router JSON-parses "?q=2024" into a number.
    expect(searchString(2024)).toBe('2024')
    expect(searchString(true)).toBe('true')
  })

  it('drops everything else', () => {
    for (const value of [
      undefined,
      null,
      Number.NaN,
      Infinity,
      {},
      [],
      ['a'],
    ]) {
      expect(searchString(value)).toBeUndefined()
    }
  })
})

describe('searchPositiveInt', () => {
  it('accepts whole numbers from 1, as numbers or numeric strings', () => {
    expect(searchPositiveInt(1)).toBe(1)
    expect(searchPositiveInt(36)).toBe(36)
    expect(searchPositiveInt('3')).toBe(3)
  })

  it('drops zero, negatives, fractions and non-numbers', () => {
    for (const value of [
      0,
      -2,
      1.5,
      '',
      ' ',
      'abc',
      '2x',
      null,
      undefined,
      {},
      Infinity,
    ]) {
      expect(searchPositiveInt(value), String(value)).toBeUndefined()
    }
  })
})

describe('searchEmail', () => {
  it('keeps plausible addresses only', () => {
    expect(searchEmail('ime@firma.ba')).toBe('ime@firma.ba')
    expect(searchEmail(' ime@firma.ba ')).toBe('ime@firma.ba')
    expect(searchEmail('ime@firma')).toBeUndefined()
    expect(searchEmail('not an email')).toBeUndefined()
    expect(searchEmail(42)).toBeUndefined()
  })
})

describe('parseBlogSearch', () => {
  it('parses every filter', () => {
    expect(
      parseBlogSearch({
        q: 'PDV',
        category: 'Porezi',
        subcategory: 'PDV',
        tag: 'obrt',
        page: 2,
        pageSize: 18,
      }),
    ).toEqual({
      q: 'PDV',
      category: 'Porezi',
      subcategory: 'PDV',
      tag: 'obrt',
      page: 2,
      pageSize: 18,
    })
  })

  it('drops unusable values instead of failing the page, and omits missing keys', () => {
    const parsed = parseBlogSearch({
      q: { x: 1 },
      page: 0,
      pageSize: 'lots',
      utm_source: 'x',
    })
    expect(parsed).toEqual({})
    expect(Object.keys(parsed)).toEqual([])
  })
})

describe('parseConfirmEmailSearch', () => {
  it('reads userId and token, both optional', () => {
    expect(parseConfirmEmailSearch({ userId: 'u1', token: 'abc' })).toEqual({
      userId: 'u1',
      token: 'abc',
    })
    expect(parseConfirmEmailSearch({})).toEqual({})
  })
})

describe('parseOAuthCallbackSearch', () => {
  it('reads the provider redirect parameters', () => {
    expect(
      parseOAuthCallbackSearch({
        code: 'c',
        state: 'Google_1',
        error: 'access_denied',
        error_description: 'no',
        other: 'x',
      }),
    ).toEqual({
      code: 'c',
      state: 'Google_1',
      error: 'access_denied',
      error_description: 'no',
    })
  })
})

describe('parseResetPasswordSearch', () => {
  it('reads the token and a valid e-mail', () => {
    expect(parseResetPasswordSearch({ token: 't', email: 'a@b.ba' })).toEqual({
      token: 't',
      email: 'a@b.ba',
    })
  })

  it('turns a missing token into "" and drops an invalid e-mail', () => {
    expect(parseResetPasswordSearch({ email: 'nope' })).toEqual({ token: '' })
  })
})
