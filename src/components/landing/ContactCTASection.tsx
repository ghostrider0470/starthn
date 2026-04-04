import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight, Phone, Mail, MapPin } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

export function ContactCTASection() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)

  return (
    <section className="py-24">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <motion.div
          className={cn(
            'relative rounded-2xl overflow-hidden',
            'bg-foreground dark:bg-card',
            'border border-transparent dark:border-primary/15',
          )}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
        >
          {/* Subtle gold accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          <div className="relative z-10 px-8 py-14 md:px-14 md:py-16 lg:px-20">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
              {/* Text */}
              <div className="lg:col-span-3">
                <h2 className={cn(
                  designSystem.typography.heading.h2,
                  'text-2xl md:text-3xl lg:text-4xl font-bold mb-4',
                  'text-background dark:text-foreground'
                )}>
                  {t('services.cta.title')}
                </h2>
                <p className="text-background/70 dark:text-muted-foreground text-lg leading-relaxed mb-8 max-w-xl">
                  {t('services.cta.description')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
                    <Link to={contactHref}>
                      Kontaktirajte nas
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-background/30 text-background hover:bg-background/10 dark:border-primary/30 dark:text-foreground dark:hover:bg-primary/10">
                    <a href="tel:+38761135377">
                      <Phone className="mr-2 h-4 w-4" />
                      +387 61/135-377
                    </a>
                  </Button>
                </div>
              </div>

              {/* Contact details */}
              <div className="lg:col-span-2 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-background/90 dark:text-foreground text-sm">Adresa</p>
                    <p className="text-background/60 dark:text-muted-foreground text-sm">Ibrahima Ljubovića 47, Ilidža, Sarajevo</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-background/90 dark:text-foreground text-sm">Email</p>
                    <p className="text-background/60 dark:text-muted-foreground text-sm">klijenti@starthn.ba</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-background/90 dark:text-foreground text-sm">Radno vrijeme</p>
                    <p className="text-background/60 dark:text-muted-foreground text-sm">Pon - Pet: 8:00 - 16:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
