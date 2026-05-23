import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

type Testimonial = {
  quote: string
  author: string
  role: string
  image?: string
}

const AUTO_ADVANCE_MS = 4000

export function TestimonialsSection() {
  const { t } = useTranslation('landing')
  const reduceMotion = useReducedMotion()
  const items = useMemo<Array<Testimonial>>(() => {
    const raw = t('testimonials.items', { returnObjects: true })
    return Array.isArray(raw) ? (raw as Array<Testimonial>) : []
  }, [t])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const total = items.length
  const goTo = useCallback(
    (n: number) => setIndex(((n % total) + total) % total),
    [total],
  )
  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    if (paused || reduceMotion || total < 2) return
    const id = window.setTimeout(next, AUTO_ADVANCE_MS)
    return () => window.clearTimeout(id)
  }, [index, next, paused, reduceMotion, total])

  if (!total) return null

  return (
    <section
      className="relative overflow-hidden bg-background py-12 md:py-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className={cn(designSystem.spacing.page.container, 'max-w-4xl')}>
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t('testimonials.overline')}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('testimonials.title')}
          </h2>
        </div>

        <div className="relative grid">
          <Quote
            aria-hidden
            className="pointer-events-none absolute -top-4 left-0 h-16 w-16 text-primary/15 md:h-24 md:w-24"
            strokeWidth={1}
          />
          {items.map((testimonial, i) => {
            const active = i === index
            return (
              <div
                key={i}
                aria-hidden={!active}
                style={{ gridArea: '1 / 1' }}
                className={cn(
                  'transition-all ease-out',
                  active
                    ? 'opacity-100 translate-y-0 duration-[700ms] delay-[120ms]'
                    : 'opacity-0 pointer-events-none translate-y-4 duration-300',
                )}
              >
                <blockquote className="relative z-10 px-4 md:px-12">
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className="h-4 w-4 fill-primary/70 text-primary/70"
                      />
                    ))}
                  </div>
                  <p className="font-heading text-lg font-medium leading-relaxed text-foreground md:text-xl">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <footer className="mt-5 flex items-center gap-4">
                    {testimonial.image ? (
                      <img
                        src={testimonial.image}
                        alt={testimonial.author}
                        width={48}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 font-heading text-base font-semibold text-primary"
                      >
                        {testimonial.author
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-foreground">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </div>
                    </div>
                  </footer>
                </blockquote>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous testimonial"
            className="group grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground/70 transition hover:border-primary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Testimonial ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index
                    ? 'w-8 bg-primary'
                    : 'w-4 bg-border hover:bg-border/70',
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            aria-label="Next testimonial"
            className="group grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground/70 transition hover:border-primary/40 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div aria-live="polite" className="sr-only">
          Testimonial {index + 1} of {total}
        </div>
      </div>
    </section>
  )
}
