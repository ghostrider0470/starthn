import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/galerija')({
  component: GalerijaPageComponent,
})

function GalerijaPageComponent() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <motion.div
          className="text-center mb-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block">
            Galerija
          </span>
          <h1 className={cn(designSystem.typography.heading.h1, 'text-4xl md:text-5xl font-bold mb-6')}>
            Naša galerija
          </h1>
          <p className="text-lg text-muted-foreground">
            Pogledajte fotografije iz našeg rada i prostora.
          </p>
        </motion.div>

        {/* Placeholder for gallery images */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              className="aspect-[4/3] rounded-2xl bg-muted/50 border border-border flex items-center justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <span className="text-muted-foreground text-sm">Fotografija {i}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
