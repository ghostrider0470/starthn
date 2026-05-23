import { Children, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionScrollerProps {
  children: ReactNode
  labels?: Array<string>
  ids?: Array<string>
}

const DESKTOP_MQ = '(min-width: 768px)'
const NAV_OFFSET = 64
const WHEEL_LOCK_MS = 700
const WHEEL_MIN_DELTA = 2
const FOOTER_FREE_SCROLL_PX = 24
const DEFAULT_SECTION_IDS = [
  'hero',
  'services',
  'why',
  'evidence',
  'values',
  'trust',
  'contact',
  'faq',
]

export function SectionScroller({
  children,
  labels = [],
  ids = [],
}: SectionScrollerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const isProgrammaticScrollRef = useRef(false)
  const currentRef = useRef(0)
  const wheelLockRef = useRef(false)
  const [current, setCurrent] = useState(0)
  const sections = Children.toArray(children)
  const total = sections.length
  const sectionIdList = ids.length > 0 ? ids : DEFAULT_SECTION_IDS
  const sectionIdsKey = sectionIdList.join('|')

  useEffect(() => {
    currentRef.current = current
  }, [current])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = root.querySelectorAll('[data-landing-section]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const idx = Number(
            (entry.target as HTMLElement).dataset.landingSection,
          )
          if (!Number.isNaN(idx)) setCurrent(idx)
        })
      },
      { root: null, threshold: 0.4 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const scrollTo = useCallback(
    (idx: number) => {
      const root = rootRef.current
      if (!root || total === 0) return
      const next = Math.max(0, Math.min(total - 1, idx))
      const el = root.querySelector(`[data-landing-section="${next}"]`)
      if (!el) return

      isProgrammaticScrollRef.current = true
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET,
        behavior: 'smooth',
      })
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false
      }, 450)
    },
    [total],
  )

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!window.matchMedia(DESKTOP_MQ).matches) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
        return
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        scrollTo(current + 1)
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        scrollTo(current - 1)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [current, scrollTo])

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return

    const idx = sectionIdsKey.split('|').indexOf(hash)
    if (idx < 0) return

    const timers = [120, 700, 1400].map((delay) =>
      window.setTimeout(() => scrollTo(idx), delay),
    )

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [scrollTo, sectionIdsKey])

  useEffect(() => {
    const getSectionEls = () => {
      const root = rootRef.current
      if (!root) return []
      return Array.from(
        root.querySelectorAll<HTMLElement>('[data-landing-section]'),
      )
    }

    const getNearestSectionIndex = () => {
      const sectionEls = getSectionEls()
      if (sectionEls.length === 0) return currentRef.current
      const nearest = sectionEls.reduce(
        (best, el, idx) => {
          const distance = Math.abs(el.getBoundingClientRect().top - NAV_OFFSET)
          return distance < best.distance ? { idx, distance } : best
        },
        { idx: currentRef.current, distance: Number.POSITIVE_INFINITY },
      )
      return nearest.idx
    }

    const isLandingInViewport = () => {
      const root = rootRef.current
      if (!root) return false
      const rect = root.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      return (
        rect.top < viewportHeight * 0.55 && rect.bottom > viewportHeight * 0.45
      )
    }

    const shouldLetTallSectionScroll = (idx: number, direction: number) => {
      const section = getSectionEls().at(idx)
      if (!section) return false
      const viewportSpan = window.innerHeight - NAV_OFFSET
      if (section.offsetHeight <= viewportSpan + 8) return false

      const rect = section.getBoundingClientRect()
      if (direction > 0)
        return rect.bottom > window.innerHeight + FOOTER_FREE_SCROLL_PX
      return rect.top < NAV_OFFSET - FOOTER_FREE_SCROLL_PX
    }

    const handleWheel = (event: WheelEvent) => {
      if (!window.matchMedia(DESKTOP_MQ).matches) return
      const root = rootRef.current
      if (
        !root ||
        !(event.target instanceof Node) ||
        !root.contains(event.target)
      )
        return
      if (
        root.getBoundingClientRect().bottom <
        window.innerHeight - FOOTER_FREE_SCROLL_PX
      )
        return
      if (!isLandingInViewport()) return
      if (isProgrammaticScrollRef.current || wheelLockRef.current) {
        event.preventDefault()
        return
      }
      if (Math.abs(event.deltaY) < WHEEL_MIN_DELTA) return

      const active = getNearestSectionIndex()
      const direction = event.deltaY > 0 ? 1 : -1
      if (shouldLetTallSectionScroll(active, direction)) return

      const next = active + direction
      if (next < 0 || next >= total) return

      event.preventDefault()
      wheelLockRef.current = true
      setCurrent(next)
      scrollTo(next)

      window.setTimeout(() => {
        wheelLockRef.current = false
      }, WHEEL_LOCK_MS)
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [scrollTo, total])

  return (
    <div ref={rootRef} className="relative overflow-x-hidden">
      {sections.map((child, i) => (
        <div
          key={i}
          id={sectionIdList[i] ?? DEFAULT_SECTION_IDS[i]}
          data-landing-section={i}
          className="relative flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col [&>*]:flex-1"
        >
          {child}
        </div>
      ))}

      <div className="pointer-events-none fixed right-4 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3 xl:flex">
        <button
          type="button"
          onClick={() => scrollTo(current - 1)}
          disabled={current === 0}
          className={cn(
            'pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full',
            'border border-border/70 bg-background/80 text-muted-foreground shadow-sm backdrop-blur-md',
            'transition-all duration-200 hover:border-primary/40 hover:bg-background hover:text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:border-border/70 disabled:hover:text-muted-foreground',
          )}
          aria-label="Previous section"
        >
          <ChevronUp className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-1 rounded-full border border-border/60 bg-background/70 px-1.5 py-2 shadow-sm backdrop-blur-md">
          {sections.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              title={labels[i] ?? `Section ${i + 1}`}
              className="group pointer-events-auto grid h-6 w-6 place-items-center rounded-full"
              aria-label={labels[i] ?? `Go to section ${i + 1}`}
              aria-current={i === current ? 'true' : undefined}
            >
              <span
                aria-hidden
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === current
                    ? 'w-5 bg-primary/75'
                    : 'w-1.5 bg-muted-foreground/35 group-hover:bg-primary/45',
                )}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollTo(current + 1)}
          disabled={current === total - 1}
          className={cn(
            'pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full',
            'border border-border/70 bg-background/80 text-muted-foreground shadow-sm backdrop-blur-md',
            'transition-all duration-200 hover:border-primary/40 hover:bg-background hover:text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:border-border/70 disabled:hover:text-muted-foreground',
          )}
          aria-label="Next section"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
