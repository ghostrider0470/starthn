/**
 * Share the D1 binding with route loaders during SSR.
 * The Hono handler stores env before calling TanStack Start's SSR.
 * Route loaders call getD1() to query D1 directly — no HTTP roundtrip.
 *
 * The binding is the same object for every request in an isolate, so it is
 * set on each request and never cleared: clearing it when one request ends
 * would null it for a concurrent request that is still rendering.
 */
import { createDb, type Database } from './db/client'

let currentBinding: unknown = null
let currentDb: Database | null = null

/** Store the D1 binding (called from server.ts on every SSR request). */
export function setD1(d1: any) {
  if (d1 && d1 === currentBinding && currentDb) return
  currentBinding = d1 ?? null
  currentDb = d1 ? createDb(d1) : null
}

/** Get D1 database for direct queries (used by route loaders) */
export function getD1(): Database | null {
  return currentDb
}
