import { useEffect, useState, useRef } from 'react'
import { Users, Clock, HeartHandshake, Award, Quote } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { CRTCounter } from './CRTCounter'

function useInView(threshold = 0.3) {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}

const testimonials = [
  { key: 'elvisa', company: 'Utjeha d.o.o', role: 'Vlasnica i direktorica' },
  { key: 'nedim', company: 'qla.dev', role: 'Vlasnik i direktor' },
  { key: 'adin', company: 'Wincome d.o.o', role: 'Vlasnik i direktor' },
  { key: 'mubera', company: 'GRAFO AG KOVAČEVIĆ', role: 'Vlasnica i direktorica' },
  { key: 'tanja', company: 'Adv. kancelarija SRDANOVIĆ', role: 'Vlasnica' },
]

export function GlobalCredibilitySection() {
  const { t } = useTranslation('landing')
  const { ref: statsRef, inView: statsInView } = useInView(0.15)

  const stats = [
    { icon: Users, value: 30, suffix: '+', label: t('credibility.stats.clients') },
    { icon: Clock, value: 15, suffix: '', label: t('credibility.stats.experience') },
    { icon: HeartHandshake, value: 2000, suffix: '+', label: t('credibility.stats.hours') },
    { icon: Award, value: 100, suffix: '%', label: t('credibility.stats.referral') },
  ]

  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">

        {/* Stats Strip */}
        <motion.div
          ref={statsRef}
          className={cn(
            'rounded-2xl p-6 sm:p-8 mb-20',
            'grid grid-cols-2 lg:grid-cols-4',
            'bg-card border border-border',
            'dark:bg-card dark:border-primary/15'
          )}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'flex flex-col items-center justify-center py-5 px-3',
                i < stats.length - 1 && 'lg:border-r border-border/50 dark:border-primary/10',
                i < 2 && 'border-b lg:border-b-0 border-border/50 dark:border-primary/10'
              )}
            >
              <stat.icon className="h-5 w-5 mb-3 text-primary/70" />
              <div className="text-3xl md:text-4xl font-bold text-foreground dark:text-primary tabular-nums tracking-tight">
                <CRTCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={1500 + i * 150}
                  startCounting={statsInView}
                  glitchIntensity="none"
                />
              </div>
              <span className="text-sm text-muted-foreground mt-1.5 text-center">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Testimonials */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block">
            Drugi o nama
          </span>
          <h2 className={cn(
            designSystem.typography.heading.h1,
            'text-3xl md:text-4xl font-bold text-foreground'
          )}>
            Sretni klijenti
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((item, i) => (
            <motion.div
              key={item.key}
              className={cn(
                'relative rounded-xl border border-border bg-card p-7',
                'transition-all duration-300',
                'hover:border-primary/25 hover:shadow-md',
                // Make the 4th and 5th span nicely on the last row
                i === 3 && 'lg:col-start-1',
                i === 4 && 'lg:col-start-2',
              )}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Quote className="h-8 w-8 text-primary/20 mb-4" />
              <p className="text-foreground leading-relaxed mb-6 text-[0.95rem]">
                {t(`credibility.proofCards.${item.key}.outcome`)}
              </p>
              <div className="border-t border-border/60 pt-4">
                <p className="font-semibold text-foreground text-sm">
                  {t(`credibility.proofCards.${item.key}.label`)}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {item.role}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
