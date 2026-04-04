import { useEffect, useState, useRef } from 'react'
import { Users, Clock, HeartHandshake, Award } from 'lucide-react'
import { motion } from 'motion/react'
import { Trans, useTranslation } from 'react-i18next'
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export function GlobalCredibilitySection() {
  const { t } = useTranslation('landing')
  const { ref: statsRef, inView: statsInView } = useInView(0.15)

  const stats = [
    { icon: Users, value: 30, suffix: '+', label: t('credibility.stats.clients') },
    { icon: Clock, value: 15, suffix: '', label: t('credibility.stats.experience') },
    { icon: HeartHandshake, value: 2000, suffix: '+', label: t('credibility.stats.hours') },
    { icon: Award, value: 100, suffix: '%', label: t('credibility.stats.referral') },
  ]

  const proofCards = [
    {
      key: 'elvisa',
      tags: ['Utjeha d.o.o', 'Vlasnica i direktorica'],
    },
    {
      key: 'nedim',
      tags: ['qla.dev', 'Vlasnik i direktor'],
    },
    {
      key: 'adin',
      tags: ['Wincome d.o.o', 'Vlasnik i direktor'],
    },
    {
      key: 'mubera',
      tags: ['GRAFO AG KOVAČEVIĆ', 'Vlasnica i direktorica'],
    },
    {
      key: 'tanja',
      tags: ['Adv. kancelarija SRDANOVIĆ', 'Vlasnica'],
    },
  ]

  const differentiators = [
    { key: 'personalized' },
    { key: 'digital' },
    { key: 'licensed' },
  ]

  return (
    <section
      id="credibility"
      className={cn('relative py-24 overflow-hidden', 'bg-muted/30')}
    >
      <div className="container mx-auto px-6 lg:px-8 relative z-30 max-w-7xl">
        {/* Header */}
        <motion.div
          className="text-center mb-14 md:mb-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block">
            {t('credibility.subtitle')}
          </span>
          <h2
            className={cn(
              designSystem.typography.heading.h1,
              'text-4xl md:text-5xl font-bold text-foreground'
            )}
          >
            <Trans
              t={t}
              i18nKey="credibility.title"
              components={{
                gradient: (
                  <span
                    className={cn(
                      'text-primary',
                      'dark:bg-gradient-to-r dark:from-primary dark:to-accent dark:bg-clip-text dark:text-transparent'
                    )}
                  />
                ),
              }}
            />
          </h2>
          <p className={cn(designSystem.typography.body.large, 'text-muted-foreground mt-4')}>
            {t('credibility.description')}
          </p>
        </motion.div>

        {/* Stats Strip */}
        <motion.div
          ref={statsRef}
          className={cn(
            'rounded-2xl p-5 sm:p-6 mb-14 md:mb-16',
            'grid grid-cols-2 lg:grid-cols-4',
            'bg-card border border-border shadow-sm',
            'dark:bg-card dark:border-primary/20'
          )}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'flex flex-col items-center justify-center py-4 px-2',
                i < stats.length - 1 && 'lg:border-r border-border/60 dark:border-primary/10',
                i < 2 && 'border-b lg:border-b-0 border-border/60 dark:border-primary/10'
              )}
            >
              <stat.icon className="h-5 w-5 mb-2 text-primary/70" />
              <div className="text-3xl md:text-4xl font-bold text-foreground dark:text-primary tabular-nums">
                <CRTCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={1500 + i * 150}
                  startCounting={statsInView}
                  glitchIntensity="none"
                />
              </div>
              <span className="text-sm text-muted-foreground mt-1 text-center">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Testimonial Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-14"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {proofCards.map((card) => (
            <motion.div
              key={card.key}
              variants={cardVariants}
              className={cn(
                'relative rounded-2xl p-5 sm:p-6 transition-all duration-300',
                'bg-card border border-border shadow-sm',
                'hover:shadow-md hover:border-primary/30 hover:-translate-y-1',
                'dark:bg-card dark:border-border/50 dark:hover:border-primary/30'
              )}
            >
              <div className="text-primary mb-3 text-2xl">"</div>
              <p className="text-foreground font-medium leading-relaxed mb-4 italic">
                {t(`credibility.proofCards.${card.key}.outcome`)}
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <span className="text-sm font-semibold text-foreground">
                  {t(`credibility.proofCards.${card.key}.label`)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-3 py-1 text-xs bg-secondary text-muted-foreground dark:bg-primary/10 dark:text-primary/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Differentiators */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {differentiators.map((diff) => (
            <motion.div
              key={diff.key}
              variants={cardVariants}
              className={cn(
                'rounded-2xl p-6 text-center',
                'bg-card border border-border',
                'dark:bg-card dark:border-primary/20'
              )}
            >
              <h3 className="text-lg font-bold text-foreground mb-2">
                {t(`credibility.differentiators.${diff.key}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`credibility.differentiators.${diff.key}.description`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
