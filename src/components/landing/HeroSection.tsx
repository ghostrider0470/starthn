import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useHydrated } from '@/hooks/useHydrated'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

type Slide = {
  overline: string
  title: string
  subtitle: string
  cta: string
  href: string
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
  const heading = hasOwnKey('hero.h1')
    ? t('hero.h1')
    : (slides[0]?.title ?? '')
  const intro = hasOwnKey('hero.intro') ? t('hero.intro') : ''

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [progressKey, setProgressKey] = useState(0)
  // Highest slide index whose photo may be rendered. SSR (and the first
  // client render) only has slide 0's image; after hydration the next slide
  // is added one step ahead of the carousel, so the extra photos never
  // compete with the LCP image.
  const [renderImagesUpTo, setRenderImagesUpTo] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const total = slides.length
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

  useEffect(() => {
    setRenderImagesUpTo((current) => Math.max(current, index + 1))
  }, [index])

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

        {/* Content stack — all rendered, active fades + slides */}
        <div
          className={cn(
            designSystem.spacing.page.container,
            'relative z-10 flex min-h-[inherit] flex-col justify-center pb-32 pt-12 sm:pt-16 md:pb-36 md:pt-24',
          )}
        >
          {/* Static page heading — one H1, outside the rotating slides */}
          <div className="mb-8 max-w-2xl [text-shadow:0_1px_2px_rgb(0_0_0/0.35)] md:mb-10">
            <h1 className="font-heading text-lg font-semibold leading-snug text-white [text-wrap:balance] sm:text-xl">
              {heading}
            </h1>
            {intro && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                {intro}
              </p>
            )}
          </div>

          <div className="relative w-full max-w-2xl min-h-[26rem] sm:min-h-[28rem] md:min-h-[30rem]">
            {slides.map((slide, i) => {
              const active = i === index
              const href = withLocalePath(slide.href, currentLocale)
              return (
                <div
                  key={i}
                  className={cn(
                    'absolute inset-0 transition-all ease-out',
                    active
                      ? 'opacity-100 translate-y-0 duration-[700ms] delay-[150ms]'
                      : 'opacity-0 pointer-events-none duration-500',
                    !active && 'translate-y-4',
                  )}
                  aria-hidden={!active}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.92_0.08_90)] sm:text-sm">
                    {slide.overline}
                  </p>
                  <div className="my-5 h-px w-14 bg-[oklch(0.92_0.08_90)]/80" />
                  <p className="mb-6 font-heading text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-white [text-wrap:balance] sm:text-5xl md:text-6xl lg:text-7xl">
                    {slide.title}
                  </p>
                  <p className="mb-10 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg md:text-xl">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-5">
                    <Button
                      asChild
                      size="lg"
                      className="landing-cta-primary group shadow-lg shadow-black/25"
                      tabIndex={active ? 0 : -1}
                    >
                      <Link to={href}>
                        {slide.cta}
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                    <img
                      src="/logo-128.webp"
                      alt=""
                      aria-hidden
                      width={44}
                      height={44}
                      loading="lazy"
                      decoding="async"
                      className="hidden h-11 w-11 opacity-80 sm:block"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Control bar */}
        <div className="absolute inset-x-0 bottom-0 z-20">
          <div
            className={cn(designSystem.spacing.page.container, 'pb-6 md:pb-10')}
          >
            <div className="flex items-center justify-between gap-4">
              <div
                className="font-mono text-xs font-medium tracking-[0.2em] text-white/70 tabular-nums"
                aria-live="polite"
              >
                {String(index + 1).padStart(2, '0')}
                <span className="mx-1 text-white/30">/</span>
                {String(total).padStart(2, '0')}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prev}
                  aria-label={t('common:a11y.prevSlide', {
                    defaultValue: 'Previous slide',
                  })}
                  className="group grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/30 text-white/90 backdrop-blur-sm transition hover:border-white/70 hover:bg-black/60 sm:h-12 sm:w-12"
                >
                  <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                </button>

                <div
                  className="mx-2 flex items-center gap-2"
                  role="tablist"
                  aria-label={t('common:a11y.slides', { defaultValue: 'Slides' })}
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
                      className="group grid h-6 place-items-center"
                    >
                      <span
                        className={cn(
                          'relative h-1.5 rounded-full transition-all duration-500',
                          i === index
                            ? 'w-12 bg-white/20'
                            : 'w-6 bg-white/30 group-hover:bg-white/50',
                        )}
                      >
                        {i === index && !effectivePaused && hydrated && (
                          <span
                            key={progressKey}
                            className="absolute inset-0 origin-left rounded-full bg-white/90"
                            style={{
                              animation: `hero-slide-progress ${AUTO_ADVANCE_MS}ms linear both`,
                            }}
                          />
                        )}
                        {i === index && effectivePaused && (
                          <span className="absolute inset-y-0 left-0 w-full rounded-full bg-white/90" />
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
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </button>
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
                className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white/70 transition hover:border-white/50 hover:text-white sm:h-10 sm:w-10"
              >
                {userPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
