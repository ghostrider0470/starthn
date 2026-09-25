import { describe, expect, it } from 'vitest'
import { readClientEnv } from './env'

describe('readClientEnv', () => {
  it('picks the known VITE_ variables', () => {
    expect(
      readClientEnv({
        VITE_FEATURE_CHAT: 'true',
        VITE_AZURE_BLOB_ORIGIN: 'https://example.blob.core.windows.net',
        SECRET: 'never exposed',
        VITE_UNKNOWN: 'x',
      }),
    ).toEqual({
      VITE_FEATURE_CHAT: 'true',
      VITE_AZURE_BLOB_ORIGIN: 'https://example.blob.core.windows.net',
    })
  })

  it('treats empty strings and non-strings as unset', () => {
    expect(
      readClientEnv({
        VITE_APP_TITLE: '',
        VITE_FEATURE_CHAT: true,
        VITE_AZURE_BLOB_ORIGIN: '',
      }),
    ).toEqual({})
  })

  it('fails loudly on a URL variable that is not a URL', () => {
    expect(() =>
      readClientEnv({ VITE_AZURE_BLOB_ORIGIN: 'not a url' }),
    ).toThrow(/VITE_AZURE_BLOB_ORIGIN/)
  })
})
