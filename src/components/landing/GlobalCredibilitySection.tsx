import { Globe, Clock, Code, Layers, ArrowUpRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Trans, useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { useScrollReveal } from '@/hooks/useScrollReveal'

// ---------------------------------------------------------------------------
// Data moved into component body for i18n
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: designSystem.animation.motion.distance.slideUp },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: designSystem.animation.motion.duration.base,
      ease: designSystem.animation.motion.ease.out,
    },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function GlobalCredibilitySection() {
  const { t } = useTranslation('landing')

  const { ref: sectionRef } = useScrollReveal({
    threshold: 0.2,
    rootMargin: '-100px',
  })

  // Data arrays moved here for i18n
  const stats = [
    { icon: Clock, value: 50, suffix: '+', label: t('credibility.stats.experience') },
    { icon: Globe, value: 9, suffix: '+', label: t('credibility.stats.countries') },
    { icon: Code, value: 20, suffix: '+', label: t('credibility.stats.systems') },
    { icon: Layers, value: 10, suffix: '+', label: t('credibility.stats.industries') },
  ]

  const proofCards = [
    {
      label: t('credibility.proofCards.atlascopco.label'),
      outcome: t('credibility.proofCards.atlascopco.outcome'),
      tags: ['Azure', 'Kubernetes', 'One Identity'],
    },
    {
      label: t('credibility.proofCards.orange.label'),
      outcome: t('credibility.proofCards.orange.outcome'),
      tags: ['Azure Kubernetes', 'Azure Pipelines', 'ServiceNow'],
    },
    {
      label: t('credibility.proofCards.telecom.label'),
      outcome: t('credibility.proofCards.telecom.outcome'),
      tags: ['GIS', 'Unity AR', '.NET', 'SQL'],
    },
  ]

  return (
    <section
      id="credibility"
      className={cn(
        'relative py-24 overflow-hidden',
        'bg-muted/30'
      )}
    >
      {/* ── Dark-only background decorations ───────────────────────── */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl hidden dark:block" />

      {/* ── Container ──────────────────────────────────────────────── */}
      <div
        ref={sectionRef as React.RefObject<HTMLDivElement>}
        className="container mx-auto px-6 lg:px-8 relative z-30 max-w-7xl"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div
          className="text-center mb-14 md:mb-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: designSystem.animation.motion.distance.slideUp }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{
            duration: designSystem.animation.motion.duration.base,
            ease: designSystem.animation.motion.ease.out,
          }}
        >
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block">
            {t('credibility.subtitle')}
          </span>

          <h2
            className={cn(
              designSystem.typography.heading.h1,
              'landing-section-heading text-4xl md:text-5xl font-bold text-foreground'
            )}
          >
            <Trans
              t={t}
              i18nKey="credibility.title"
              components={{
                gradient: (
                  <span
                    className={cn(
                      'text-foreground',
                      'dark:bg-gradient-to-r dark:from-primary dark:to-accent dark:bg-clip-text dark:text-transparent'
                    )}
                  />
                ),
              }}
            />
          </h2>

          <p
            className={cn(
              designSystem.typography.body.large,
              'landing-section-lead text-muted-foreground dark:text-muted-foreground'
            )}
          >
            {t('credibility.description')}
          </p>
        </motion.div>

        {/* ── Stats Strip ────────────────────────────────────────── */}
        <motion.div
          className={cn(
            'rounded-2xl p-5 sm:p-6 mb-14 md:mb-16',
            'grid grid-cols-2 lg:grid-cols-4',
            // Light
            'bg-card border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
            // Dark
            'dark:bg-card dark:border-primary/20'
          )}
          initial={{ opacity: 0, y: designSystem.animation.motion.distance.slideUp }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: designSystem.animation.motion.duration.base,
            delay: 0.1,
            ease: designSystem.animation.motion.ease.out,
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'flex flex-col items-center justify-center py-4 px-2',
                // Divider between items, not on the last
                i < stats.length - 1 && 'lg:border-r border-border/60 dark:border-primary/10',
                // On 2-col mobile layout, add bottom border on first row
                i < 2 && 'border-b lg:border-b-0 border-border/60 dark:border-primary/10'
              )}
            >
              <stat.icon className="h-5 w-5 mb-2 text-muted-foreground/80 dark:text-primary/70" />
              <div className="text-3xl md:text-4xl font-bold text-foreground dark:text-primary tabular-nums">
                {stat.value}{stat.suffix}
              </div>
              <span className="text-sm text-muted-foreground dark:text-muted-foreground mt-1 text-center">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* ── Proof Cards ────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {proofCards.map((card) => (
            <motion.div
              key={card.label}
              variants={cardVariants}
              className={cn(
                'group relative rounded-2xl p-5 sm:p-6 transition-all duration-300',
                // Light
                'bg-card border border-border',
                'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
                'hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:border-primary/30 hover:-translate-y-1',
                // Dark
                'dark:bg-card dark:border-border/50',
                'dark:hover:border-primary/30 dark:hover:shadow-primary/5'
              )}
            >
              {/* Project label */}
              <span
                className={cn(
                  'text-xs font-medium uppercase tracking-wider block mb-3',
                  'text-muted-foreground/80',
                  'dark:text-primary/70'
                )}
              >
                {card.label}
              </span>

              {/* Outcome */}
              <p className="text-foreground dark:text-foreground font-semibold leading-snug mb-4">
                {card.outcome}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs',
                      'bg-secondary text-muted-foreground',
                      'dark:bg-primary/10 dark:text-primary/80'
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Hover arrow indicator */}
              <ArrowUpRight
                className={cn(
                  'absolute top-5 right-5 h-4 w-4 opacity-0 transition-all duration-300',
                  'group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
                  'text-muted-foreground/40 dark:text-primary/40'
                )}
              />
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
