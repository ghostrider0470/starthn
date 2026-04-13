import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export type Database = ReturnType<typeof createDb>

/** Create a typed Drizzle instance from the D1 binding */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

/** Safely parse a JSON column, returning fallback on null/invalid */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (value == null) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

/**
 * Unwrap a value that may be stored as a JSON-encoded string.
 * Handles legacy data that was written via JSON.stringify — returns the
 * decoded inner string if parsing yields a string, otherwise returns the
 * raw value. Null/undefined passes through.
 */
export function parseJsonString(value: string | null | undefined): string | null {
  if (value == null) return null
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'string' ? parsed : value
  } catch {
    return value
  }
}
