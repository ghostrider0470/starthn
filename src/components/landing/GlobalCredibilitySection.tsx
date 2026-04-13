import { motion } from 'motion/react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const stats = [
  { value: '50+', label: 'Klijenata' },
  { value: '10+', label: 'Godina iskustva' },
  { value: '5000+', label: 'Sati podrške' },
  { value: '95%', label: 'Preporuka' },
]

const valueProps = [
  {
    title: 'Individualizirani pristup',
    description:
      'Svaki klijent dobiva osobnog savjetnika koji razumije specifičnosti njegovog poslovanja i pruža rješenja prilagođena upravo njemu.',
  },
  {
    title: 'Prilagođena rješenja',
    description:
      'Kombiniramo stručnost i moderne alate kako bismo kreirali financijske strategije koje prate rast vašeg poslovanja.',
  },
  {
    title: 'Kontinuirana edukacija',
    description:
      'Naš tim neprestano prati promjene u regulativi i poreznom zakonodavstvu kako biste uvijek bili korak ispred.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const itemVariants = {
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

export function GlobalCredibilitySection() {
  return (
    <section id="credibility" className="relative py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8 relative z-30 max-w-5xl">
        {/* Stats row */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="text-center"
            >
              <div className="text-primary font-bold text-4xl md:text-5xl tabular-nums">
                {stat.value}
              </div>
              <span className="text-muted-foreground text-sm mt-2 block">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Value props */}
        <motion.div
          className={cn(
            designSystem.grid.responsive.three,
            designSystem.spacing.gap.xl
          )}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {valueProps.map((prop) => (
            <motion.div key={prop.title} variants={itemVariants}>
              <h3 className="font-semibold text-foreground text-lg mb-2">
                {prop.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {prop.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
