/**
 * Share the D1 binding with route loaders during SSR.
 * The Hono handler stores env before calling TanStack Start's SSR.
 * Route loaders call getD1() to query D1 directly — no HTTP roundtrip.
 */
import { createDb, type Database } from './db/client'

let currentDb: Database | null = null

/** Store D1 binding for the current request (called from server.ts) */
export function setD1(d1: any) {
  currentDb = d1 ? createDb(d1) : null
}

/** Get D1 database for direct queries (used by route loaders) */
export function getD1(): Database | null {
  return currentDb
}

/** Clear after request */
export function clearD1() {
  currentDb = null
}
