import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Phone,
  Play,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  CallLink,
  GoogleRatingLink,
  useCallLabels,
} from '@/components/ContactActions'
import { useHydrated } from '@/hooks/useHydrated'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { whenIdleOrInteraction } from '@/components/chat/when-idle'
import { featureFlags } from '@/lib/feature-flags'
import { useChatLauncherClearance } from '@/components/chat/launcher-clearance'

/**
 * Marks a control the chat launcher must never cover (see
 * launcher-clearance.ts): while it sits under the launcher, the launcher
 * steps aside.
 */
const AVOID_LAUNCHER = { 'data-chat-launcher-avoid': '' } as const

/**
 * One rotating message. The slide JSON also carries `cta`/`href`, but the
 * call to action no longer rotates: every slide shares the static CTA row
 * below the slides (hero.cta.primary → /contact, plus tap-to-call).
 */
type Slide = {
  overline: string
  title: string
  subtitle: string
}

const SLIDE_IMAGES = [
  {
    src: '/hero/slide-3-1440.webp',
    srcSet:
      '/hero/slide-3-960.webp 960w, /hero/slide-3-1440.webp 1440w, /hero/slide-3.webp 1920w',
    width: 1920,
    height: 1280,
  },
  {
    src: '/hero/slide-1-1440.webp',
    srcSet:
      '/hero/slide-1-960.webp 960w, /hero/slide-1-1440.webp 1440w, /hero/slide-1.webp 1920w',
    width: 1920,
    height: 1281,
  },
  {
    src: '/hero/slide-2-1440.webp',
    srcSet:
      '/hero/slide-2-960.webp 960w, /hero/slide-2-1440.webp 1440w, /hero/slide-2.webp 1920w',
    width: 1920,
    height: 1282,
  },
] as const

const AUTO_ADVANCE_MS = 4000

// Progress fill of the active slide dot: a compositor-only CSS animation.
const PROGRESS_CSS = `
  @keyframes hero-slide-progress {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
`

export function HeroSection() {
  const { t, i18n } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const callLabels = useCallLabels()
  const reduceMotion = useReducedMotion()
  // The auto-advance timer only starts after hydration, so the progress fill
  // must too; the server HTML shows an empty track.
  const hydrated = useHydrated()

  const slides = useMemo<Array<Slide>>(() => {
    const raw = t('hero.slides', { returnObjects: true })
    return Array.isArray(raw) ? (raw as Array<Slide>) : []
  }, [t])

  // The page's single H1 lives outside the carousel. Until a locale has the
  // hero.h1 / hero.intro keys, fall back to the first slide's title and skip
  // the intro rather than rendering a raw key. The check ignores fallback
  // languages: the SSR store may hold bs-BA while the client only has the
  // page's own locale, and both must render the same markup.
  const hasOwnKey = (key: string) =>
    i18n.exists(key, { ns: 'landing', fallbackLng: false })
  const heading = hasOwnKey('hero.h1') ? t('hero.h1') : (slides[0]?.title ?? '')
  const intro = hasOwnKey('hero.intro') ? t('hero.intro') : ''

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [progressKey, setProgressKey] = useState(0)
  // Highest slide index whose photo may be rendered. SSR (and the first
  // client render) only has slide 0's image; the next slide's photo is added
  // once the page has loaded and the browser is idle (well before the first
  // auto-advance), then one step ahead of the carousel, so the extra photos
  // never compete with the LCP image, CSS or fonts.
  const [renderImagesUpTo, setRenderImagesUpTo] = useState(0)
  const [preloadNext, setPreloadNext] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const total = slides.length
  const sectionRef = useRef<HTMLElement>(null)
  // Starts once the section renders (it needs slides).
  useChatLauncherClearance(sectionRef, featureFlags.chat && total > 0)
  const effectivePaused = paused || userPaused || !!reduceMotion

  const goTo = useCallback(
    (next: number) => {
      if (!total) return
      setIndex(((next % total) + total) % total)
      setProgressKey((k) => k + 1)
    },
    [total],
  )
  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(
    () => whenIdleOrInteraction(() => setPreloadNext(true), { delayMs: 0 }),
    [],
  )

  useEffect(() => {
    setRenderImagesUpTo((current) =>
      Math.max(current, index + (preloadNext ? 1 : 0)),
    )
  }, [index, preloadNext])

  useEffect(() => {
    if (effectivePaused || total < 2) return
    const id = window.setTimeout(next, AUTO_ADVANCE_MS)
    return () => window.clearTimeout(id)
  }, [index, next, effectivePaused, total])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  // Reset hover-pause when window loses focus (tab switch while hovering)
  useEffect(() => {
    const reset = () => setPaused(false)
    window.addEventListener('blur', reset)
    return () => window.removeEventListener('blur', reset)
  }, [])

  if (!total) return null

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Start HN"
      className="relative isolate overflow-hidden bg-background"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPaused(false)
        }
      }}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)()
        touchStartX.current = null
      }}
    >
      <style>{PROGRESS_CSS}</style>
      <div className="relative min-h-[calc(100svh-4rem)]">
        {/* Image stack — all rendered, active fades in */}
        {slides.map((_, i) => (
          <div
            key={i}
            className={cn(
              'absolute inset-0 transition-opacity duration-[900ms] ease-out',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden
          >
            {i <= renderImagesUpTo && (
              <img
                src={SLIDE_IMAGES[i].src}
                srcSet={SLIDE_IMAGES[i].srcSet}
                sizes="100vw"
                alt=""
                width={SLIDE_IMAGES[i].width}
                height={SLIDE_IMAGES[i].height}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : undefined}
                decoding="async"
                className="h-full w-full object-cover object-center"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/8 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
          </div>
        ))}

        {/* Content. Phones: top-aligned, with bottom padding that clears the
            carousel controls and the fixed bottom nav (incl. the safe-area
            inset), so the CTA sits in the first screen. */}
        <div
          className={cn(
            designSystem.spacing.page.container,
            'relative z-10 flex min-h-[inherit] flex-col justify-start pb-[calc(9.5rem+env(safe-area-inset-bottom))] pt-6 sm:pt-16 md:justify-center md:pb-36 md:pt-24',
          )}
        >
          {/* Static page heading — one H1, outside the rotating slides */}
          <div className="mb-5 max-w-2xl [text-shadow:0_1px_2px_rgb(0_0_0/0.35)] md:mb-10">
            <h1 className="font-heading text-[1.375rem] font-semibold leading-tight text-white [text-wrap:balance] sm:text-2xl md:text-[1.75rem]">
              {heading}
            </h1>
            {intro && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
                {intro}
              </p>
            )}
          </div>

          {/* Rotating messages, stacked in one grid cell so the block is as
              tall as the longest slide (no overlap with the CTA row). The
              old slide fades out before the new one fades in. */}
          <div className="grid w-full max-w-2xl">
            {slides.map((slide, i) => {
              const active = i === index
              return (
                <div
                  key={i}
                  style={{ gridArea: '1 / 1' }}
                  className={cn(
                    'transition-[opacity,transform] ease-out motion-reduce:transition-none',
                    active
                      ? 'translate-y-0 opacity-100 delay-[250ms] duration-500'
                      : 'pointer-events-none translate-y-2 opacity-0 duration-200',
                  )}
                  aria-hidden={!active}
                >
                  <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.92_0.08_90)] sm:text-sm md:block">
                    {slide.overline}
                  </p>
                  <div
                    aria-hidden
                    className="my-5 hidden h-px w-14 bg-[oklch(0.92_0.08_90)]/80 md:block"
                  />
                  <p className="font-heading text-3xl font-bold leading-[1.05] tracking-[-0.02em] text-white [text-wrap:balance] sm:text-5xl md:text-6xl lg:text-7xl">
                    {slide.title}
                  </p>
                  <p className="mt-3 max-w-xl text-base leading-relaxed text-white/90 sm:mt-5 sm:text-lg md:text-xl">
                    {slide.subtitle}
                  </p>
                </div>
              )
            })}
          </div>

          {/* The same call to action on every slide. */}
          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-10 sm:gap-4">
            <Button
              asChild
              size="lg"
              className="landing-cta-primary group shadow-lg shadow-black/25"
              {...AVOID_LAUNCHER}
            >
              <Link to={withLocalePath('/contact', currentLocale)}>
                {t('hero.cta.primary')}
                <ArrowRight
                  aria-hidden
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/60 bg-black/35 text-white shadow-lg shadow-black/20 backdrop-blur-sm hover:bg-black/55 hover:text-white dark:border-white/60 dark:bg-black/35 dark:hover:bg-black/55"
              {...AVOID_LAUNCHER}
            >
              <CallLink placement="home_hero">
                <Phone aria-hidden className="h-4 w-4" />
                {callLabels.call}
                <span className="sr-only"> {callLabels.phone}</span>
              </CallLink>
            </Button>
          </div>
          <div className="mt-2 self-start" {...AVOID_LAUNCHER}>
            <GoogleRatingLink
              tone="onDark"
              className="[text-shadow:0_1px_2px_rgb(0_0_0/0.45)]"
            />
          </div>
        </div>

        {/* Control bar */}
        <div className="absolute inset-x-0 bottom-0 z-20">
          <div
            className={cn(
              designSystem.spacing.page.container,
              // Phones: above the fixed bottom nav and the safe-area inset.
              'pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10',
            )}
          >
            {/* [pause][prev][dots][next], starting at the inline start. On
                phones the row is 220px wide, so it fits the narrowest screen
                (320px minus the gutters) and ends left of the chat launcher,
                which is anchored at the inline end (x >= 240 at 320px). The
                pause button therefore never sits under the launcher, however
                tall the hero copy grows (WCAG 2.2.2); anything that still
                meets it makes the launcher step aside (AVOID_LAUNCHER). From
                md the row is centred, with the counter at the inline start. */}
            <div className="relative flex items-center justify-start gap-2 md:justify-center">
              {/* Announced only while paused: a rotating carousel must not
                  interrupt screen-reader users every few seconds. */}
              <span
                className="sr-only"
                aria-live={effectivePaused ? 'polite' : 'off'}
              >
                {`${index + 1} / ${total}`}
              </span>
              <div
                aria-hidden
                className="absolute start-0 hidden font-mono text-xs font-medium tracking-[0.2em] text-white/90 tabular-nums [text-shadow:0_1px_2px_rgb(0_0_0/0.45)] md:block"
              >
                {String(index + 1).padStart(2, '0')}
                <span className="mx-1 text-white/60">/</span>
                {String(total).padStart(2, '0')}
              </div>

              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={
                  userPaused
                    ? t('common:a11y.resumeCarousel', {
                        defaultValue: 'Resume carousel',
                      })
                    : t('common:a11y.pauseCarousel', {
                        defaultValue: 'Pause carousel',
                      })
                }
                aria-pressed={userPaused}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/40 bg-black/30 text-white/90 backdrop-blur-sm transition hover:border-white/70 hover:bg-black/60 hover:text-white md:me-2"
                {...AVOID_LAUNCHER}
              >
                {userPaused ? (
                  <Play aria-hidden className="h-4 w-4" />
                ) : (
                  <Pause aria-hidden className="h-4 w-4" />
                )}
              </button>

              <div
                className="flex shrink-0 items-center gap-1 sm:gap-2"
                {...AVOID_LAUNCHER}
              >
                <button
                  type="button"
                  onClick={prev}
                  aria-label={t('common:a11y.prevSlide', {
                    defaultValue: 'Previous slide',
                  })}
                  className="group grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/30 text-white/90 backdrop-blur-sm transition hover:border-white/70 hover:bg-black/60 sm:h-12 sm:w-12"
                >
                  <ChevronLeft
                    aria-hidden
                    className="h-5 w-5 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5"
                  />
                </button>

                {/* Phones: 24px-wide dot targets side by side (WCAG 2.5.8),
                    active bar 24px; from sm the wider bars return. */}
                <div
                  className="flex items-center sm:mx-2 sm:gap-2"
                  role="tablist"
                  aria-label={t('common:a11y.slides', {
                    defaultValue: 'Slides',
                  })}
                >
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-label={t('common:a11y.goToSlide', {
                        n: i + 1,
                        defaultValue: `Go to slide ${i + 1}`,
                      })}
                      onClick={() => goTo(i)}
                      className="group grid h-11 w-6 place-items-center sm:w-auto sm:min-w-6"
                    >
                      <span
                        className={cn(
                          'relative h-1.5 overflow-hidden rounded-full transition-all duration-500',
                          i === index
                            ? 'w-6 bg-white/20 sm:w-12'
                            : 'w-3 bg-white/30 group-hover:bg-white/50 sm:w-6',
                        )}
                      >
                        {i === index && !effectivePaused && hydrated && (
                          <span
                            key={progressKey}
                            className="absolute inset-0 origin-left rounded-full bg-white/90 rtl:origin-right"
                            style={{
                              animation: `hero-slide-progress ${AUTO_ADVANCE_MS}ms linear both`,
                            }}
                          />
                        )}
                        {i === index && effectivePaused && (
                          <span className="absolute inset-0 rounded-full bg-white/90" />
                        )}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={next}
                  aria-label={t('common:a11y.nextSlide', {
                    defaultValue: 'Next slide',
                  })}
                  className="group grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/30 text-white/90 shadow-lg shadow-black/20 backdrop-blur-sm transition hover:border-white/70 hover:bg-black/60 sm:h-12 sm:w-12"
                >
                  <ChevronRight
                    aria-hidden
                    className="h-5 w-5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
