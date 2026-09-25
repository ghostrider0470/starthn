import { useEffect, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'
import type { analytics as AnalyticsApi } from '@/lib/analytics'
import { getConsent, onConsentChange } from '@/lib/consent'

type Analytics = typeof AnalyticsApi

let analyticsModule: Promise<Analytics> | null = null

/**
 * Dynamic import keeps analytics out of the entry chunk. One shared promise,
 * so queued calls run in the order they were made.
 */
function loadAnalytics(): Promise<Analytics> {
  if (!analyticsModule) {
    analyticsModule = import('@/lib/analytics')
      .then((m) => m.analytics)
      .catch((error: unknown) => {
        analyticsModule = null
        throw error
      })
  }
  return analyticsModule
}

/** Upper bound for the idle-time deferral of analytics start-up. */
export const ANALYTICS_IDLE_TIMEOUT_MS = 3000

/**
 * Run `callback` when the main thread is idle (requestIdleCallback, capped at
 * ANALYTICS_IDLE_TIMEOUT_MS), or after ANALYTICS_IDLE_TIMEOUT_MS where
 * requestIdleCallback is unsupported (Safari). Returns a cancel function.
 */
function runWhenIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => callback(), {
      timeout: ANALYTICS_IDLE_TIMEOUT_MS,
    })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(callback, ANALYTICS_IDLE_TIMEOUT_MS)
  return () => window.clearTimeout(id)
}

function sendPageView(
  lastSent: { current: string | null },
  path: string,
  title?: string,
): void {
  if (lastSent.current === path) return
  lastSent.current = path
  void loadAnalytics()
    .then((analytics) => analytics.page(path, title))
    .catch(() => {})
}

/**
 * Initialize analytics and track route changes.
 * Call once in RootComponent. Does NOT depend on AuthProvider.
 *
 * Consent-gated (decision D4): GA4 and Clarity start only when
 * getConsent() === 'granted' — deferred to browser idle time when consent was
 * already given on an earlier visit, or immediately when the visitor accepts
 * in the cookie banner (then the current page view is sent). With no decision
 * or a refusal nothing is loaded.
 */
export function useAnalytics(): void {
  const location = useLocation()
  const path = location.pathname + location.searchStr

  const pathRef = useRef(path)
  pathRef.current = path
  const prevPathRef = useRef(path)
  /** Consent granted and tracking started: route changes send page views. */
  const activeRef = useRef(false)
  const lastSentRef = useRef<string | null>(null)
  /** Starts a still-pending idle start-up right away. */
  const flushPendingRef = useRef<(() => void) | null>(null)

  // Start-up + consent changes
  useEffect(() => {
    let cancelIdle: (() => void) | null = null
    const landingPath = pathRef.current
    const landingTitle = document.title

    const clearPending = () => {
      cancelIdle?.()
      cancelIdle = null
      flushPendingRef.current = null
    }

    const start = (startPath: string, title?: string) => {
      clearPending()
      activeRef.current = true
      void loadAnalytics()
        .then((analytics) => analytics.init())
        .catch(() => {})
      sendPageView(lastSentRef, startPath, title)
    }

    if (getConsent() === 'granted') {
      cancelIdle = runWhenIdle(() => {
        cancelIdle = null
        start(landingPath, landingTitle)
      })
      flushPendingRef.current = () => start(landingPath, landingTitle)
    }

    const unsubscribe = onConsentChange((value) => {
      if (value === 'granted') {
        if (activeRef.current) return
        lastSentRef.current = null
        start(pathRef.current)
        return
      }
      clearPending()
      activeRef.current = false
      void loadAnalytics()
        .then((analytics) => analytics.revoke())
        .catch(() => {})
    })

    return () => {
      clearPending()
      unsubscribe()
    }
  }, [])

  // Track page views on route change (pathname + search)
  useEffect(() => {
    if (prevPathRef.current === path) return
    prevPathRef.current = path
    // Navigated before the idle start-up ran: start now so the landing page
    // view is recorded first.
    flushPendingRef.current?.()
    if (activeRef.current) sendPageView(lastSentRef, path)
  }, [path])
}

/**
 * Identify the current user for analytics. Call inside AuthProvider.
 * Only takes effect with analytics consent; only the opaque user id and role
 * are sent — never the name or email.
 */
export function useAnalyticsIdentify(user: {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  roles?: Array<string>
} | null): void {
  useEffect(() => {
    if (getConsent() !== 'granted') return
    void loadAnalytics()
      .then((analytics) => {
        if (user?.id) {
          return analytics.identify(user.id, {
            role: user.roles?.[0] ?? 'user',
          })
        }
        return analytics.reset()
      })
      .catch(() => {})
  }, [user?.id, user?.roles])
}
