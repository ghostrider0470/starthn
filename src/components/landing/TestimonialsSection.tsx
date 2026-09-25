import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GoogleRatingLink } from '@/components/ContactActions'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

type Testimonial = {
  quote: string
  author: string
  role: string
  image?: string
}

/**
 * Client testimonials, one at a time.
 *
 * The card is as tall as the testimonial on screen (no blank space under a
 * short quote). It changes only when the visitor asks (arrows, dots, swipe):
 * with an auto-advance, every height change would move the content below it
 * while someone is reading (layout shift), and a 2.5 s rotation had no pause
 * control (WCAG 2.2.2).
 */
export function TestimonialsSection() {
  const { t } = useTranslation('landing')
  const items = useMemo<Array<Testimonial>>(() => {
    const raw = t('testimonials.items', { returnObjects: true })
    return Array.isArray(raw) ? (raw as Array<Testimonial>) : []
  }, [t])
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const total = items.length
  const goTo = useCallback(
    (n: number) => setIndex(((n % total) + total) % total),
    [total],
  )
  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  if (!total) return null

  return (
    <section className="relative overflow-hidden bg-background py-12 md:py-14">
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

        <div
          className="relative"
          onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX.current == null) return
            const dx = e.changedTouches[0].clientX - touchStartX.current
            if (Math.abs(dx) > 40) (dx < 0 ? next : prev)()
            touchStartX.current = null
          }}
        >
          <Quote
            aria-hidden
            className="pointer-events-none absolute -top-4 left-0 h-16 w-16 text-primary/15 md:h-24 md:w-24"
            strokeWidth={1}
          />
          {items.map((testimonial, i) => {
            const active = i === index
            // Only the testimonial on screen takes up space; the others stay
            // in the markup (server-rendered, crawlable) but out of the flow.
            return (
              <div
                key={i}
                aria-hidden={!active}
                data-active={active || undefined}
                className={cn(
                  'transition-opacity ease-out motion-reduce:transition-none',
                  active
                    ? 'relative opacity-100 duration-500'
                    : 'pointer-events-none invisible absolute inset-x-0 top-0 opacity-0 duration-200',
                )}
              >
                <blockquote className="relative z-10 px-4 md:px-12">
                  <div aria-hidden className="mb-4 flex gap-1">
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

        <div className="mt-5 flex items-center justify-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={prev}
            aria-label={t('common:a11y.prevTestimonial', {
              defaultValue: 'Previous testimonial',
            })}
            className="group grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground/70 transition hover:border-primary hover:text-foreground"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>
          <div className="flex items-center">
            {items.map((_, i) => (
              // A 32×44 hit area around each 6px dot.
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={t('common:a11y.goToTestimonial', {
                  n: i + 1,
                  defaultValue: `Testimonial ${i + 1}`,
                })}
                aria-current={i === index ? 'true' : undefined}
                className="group grid h-11 w-8 place-items-center"
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === index
                      ? 'w-6 bg-primary'
                      : 'w-3 bg-border group-hover:bg-muted-foreground/60',
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            aria-label={t('common:a11y.nextTestimonial', {
              defaultValue: 'Next testimonial',
            })}
            className="group grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground/70 transition hover:border-primary/40 hover:text-foreground"
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <div aria-live="polite" className="sr-only">
          {t('common:a11y.testimonialCounter', {
            n: index + 1,
            total,
            defaultValue: `Testimonial ${index + 1} of ${total}`,
          })}
        </div>

        {/* The Google rating, as visible text linked to the profile. */}
        <div className="mt-6 flex justify-center">
          <GoogleRatingLink />
        </div>
      </div>
    </section>
  )
}
