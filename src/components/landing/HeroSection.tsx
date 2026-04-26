import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
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
  '/hero/slide-1.webp',
  '/hero/slide-2.webp',
  '/hero/slide-3.webp',
] as const

const AUTO_ADVANCE_MS = 7000

export function HeroSection() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const reduceMotion = useReducedMotion()

  const slides = useMemo<Slide[]>(() => {
    const raw = t('hero.slides', { returnObjects: true })
    return Array.isArray(raw) ? (raw as Slide[]) : []
  }, [t])

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [progressKey, setProgressKey] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const total = slides?.length ?? 0
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

  if (!total) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Start HN"
      className="relative isolate overflow-hidden bg-background"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)()
        touchStartX.current = null
      }}
    >
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
            <img
              src={SLIDE_IMAGES[i]}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        ))}

        {/* Content stack — all rendered, active fades + slides */}
        <div className={cn(designSystem.spacing.page.container, 'relative z-10 flex min-h-[inherit] items-center pb-32 pt-20 md:pb-36 md:pt-24')}>
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
                  <h1 className="mb-6 font-heading text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-white [text-wrap:balance] sm:text-5xl md:text-6xl lg:text-7xl">
                    {slide.title}
                  </h1>
                  <p className="mb-10 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg md:text-xl">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-5">
                    <Button asChild size="lg" className="landing-cta-primary group shadow-lg shadow-black/25" tabIndex={active ? 0 : -1}>
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
          <div className={cn(designSystem.spacing.page.container, 'pb-6 md:pb-10')}>
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
                  aria-label="Previous slide"
                  className="group grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/30 text-white/90 backdrop-blur-sm transition hover:border-white/70 hover:bg-black/60 sm:h-12 sm:w-12"
                >
                  <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                </button>

                <div className="mx-2 flex items-center gap-2" role="tablist" aria-label="Slides">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-label={`Go to slide ${i + 1}`}
                      onClick={() => goTo(i)}
                      className="group grid h-6 place-items-center"
                    >
                      <span
                        className={cn(
                          'relative h-1.5 rounded-full transition-all duration-500',
                          i === index ? 'w-12 bg-white/20' : 'w-6 bg-white/30 group-hover:bg-white/50',
                        )}
                      >
                        {i === index && !effectivePaused && (
                          <motion.span
                            key={progressKey}
                            className="absolute inset-y-0 left-0 rounded-full bg-[oklch(0.92_0.08_90)]"
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
                          />
                        )}
                        {i === index && effectivePaused && (
                          <span className="absolute inset-y-0 left-0 w-full rounded-full bg-[oklch(0.92_0.08_90)]" />
                        )}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={next}
                  aria-label="Next slide"
                  className="group grid h-11 w-11 place-items-center rounded-full border border-[oklch(0.92_0.08_90)]/70 bg-[oklch(0.82_0.09_88)] text-[oklch(0.25_0.04_80)] shadow-lg shadow-black/20 transition hover:bg-[oklch(0.88_0.08_90)] sm:h-12 sm:w-12"
                >
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={userPaused ? 'Resume carousel' : 'Pause carousel'}
                aria-pressed={userPaused}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white/70 transition hover:border-white/50 hover:text-white sm:h-10 sm:w-10"
              >
                {userPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
