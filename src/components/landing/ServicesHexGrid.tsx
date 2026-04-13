import { Link, useLocation } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

const serviceKeys = [
  'customSoftware',
  'aiMl',
  'cloud',
  'iot',
  'devops',
  'digital',
] as const

const rowVariants = {
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

export function ServicesHexGrid() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)

  return (
    <section className="relative py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8 relative z-30 max-w-5xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: designSystem.animation.motion.distance.slideUp }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{
            duration: designSystem.animation.motion.duration.base,
            ease: designSystem.animation.motion.ease.out,
          }}
        >
          <span className="text-sm font-medium uppercase tracking-widest text-primary mb-3 block">
            {t('services.subtitle')}
          </span>
          <h2
            className={cn(
              designSystem.typography.heading.h1,
              'landing-section-heading text-4xl md:text-5xl font-bold text-foreground'
            )}
          >
            {t('services.title')}
          </h2>
          <p
            className={cn(
              designSystem.typography.body.large,
              'landing-section-lead text-muted-foreground'
            )}
          >
            {t('services.description')}
          </p>
        </motion.div>

        {/* Service list */}
        <div className="border-t border-border">
          {serviceKeys.map((key, i) => (
            <motion.div
              key={key}
              variants={rowVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={contactHref}
                className={cn(
                  'group flex flex-col md:flex-row md:items-center gap-2 md:gap-6',
                  'py-5 border-b border-border',
                  'transition-colors hover:bg-muted/30'
                )}
              >
                {/* Number */}
                <span className="text-primary font-bold text-sm shrink-0 w-8">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Title */}
                <span className="font-semibold text-foreground shrink-0 md:w-56">
                  {t(`services.items.${key}.title`)}
                </span>

                {/* Description */}
                <span className="text-muted-foreground text-sm flex-1">
                  {t(`services.items.${key}.description`)}
                </span>

                {/* Arrow */}
                <span className="text-primary shrink-0 transition-transform group-hover:translate-x-1 hidden md:inline">
                  &rarr;
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
