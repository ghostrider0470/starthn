import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ServiceCard } from '@/components/ui/service-card'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { useStaggeredReveal } from '@/hooks/useScrollReveal'
import { useCRTEffect } from '@/hooks/useCRTEffect'

// Animation variants for staggered cards
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: designSystem.animation.motion.stagger.cards,
      delayChildren: 0.05,
    },
  },
}

const cardVariants = {
  hidden: {
    opacity: 0,
    y: designSystem.animation.motion.distance.slideUp,
  },
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

  const services = [
    {
      iconPath: [
        '/azure/10035-icon-service-App-Services.svg',
        '/azure/10787-icon-service-Code.svg',
        '/azure/10029-icon-service-Function-Apps.svg',
      ],
      title: t('services.items.customSoftware.title'),
      description: t('services.items.customSoftware.description'),
      technologies: [
        'React',
        'Node.js',
        '.NET',
        'Python',
        'TypeScript',
        'GraphQL',
        'REST APIs',
        'Microservices',
      ],
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      hoverGradient: 'hover:bg-gradient-to-br hover:from-primary/20 hover:to-accent/10',
      href: '/services/enterprise-software-development',
    },
    {
      iconPath: [
        '/azure/10167-icon-service-Machine-Learning-Studio-Workspaces.svg',
        '/azure/03332-icon-service-Power-BI-Embedded.svg',
        '/azure/00606-icon-service-Azure-Synapse-Analytics.svg',
        '/azure/10787-icon-service-Azure-Databricks.svg',
      ],
      title: t('services.items.aiMl.title'),
      description: t('services.items.aiMl.description'),
      technologies: [
        'Microsoft Fabric',
        'Power BI',
        'Synapse',
        'Databricks',
        'Azure ML',
        'TensorFlow',
        'PyTorch',
        'Tableau',
        'SQL',
        'Spark',
      ],
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      hoverGradient: 'hover:bg-gradient-to-br hover:from-primary/20 hover:to-accent/10',
      href: '/services/ai-ml-business-intelligence',
    },
    {
      iconPath: [
        '/azure/10023-icon-service-Kubernetes-Services.svg',
        '/azure/10105-icon-service-Container-Registries.svg',
        '/azure/10086-icon-service-Storage-Accounts.svg',
      ],
      title: t('services.items.cloud.title'),
      description: t('services.items.cloud.description'),
      technologies: [
        'Azure',
        'AWS',
        'GCP',
        'Kubernetes',
        'Docker',
        'Terraform',
        'ARM Templates',
        'CloudFormation',
      ],
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      hoverGradient: 'hover:bg-gradient-to-br hover:from-primary/20 hover:to-accent/10',
      href: '/services/cloud-architecture',
    },
    {
      iconPath: [
        '/azure/10182-icon-service-IoT-Hub.svg',
        '/azure/01030-icon-service-Digital-Twins.svg',
        '/azure/00039-icon-service-Event-Hubs.svg',
      ],
      title: t('services.items.iot.title'),
      description: t('services.items.iot.description'),
      technologies: [
        'IoT Hub',
        'Digital Twins',
        'Edge Computing',
        'MQTT',
        'LoRaWAN',
        'Arduino',
        'Raspberry Pi',
        'Time Series',
      ],
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      hoverGradient: 'hover:bg-gradient-to-br hover:from-primary/20 hover:to-accent/10',
      href: '/services/iot-edge-computing',
    },
    {
      iconPath: [
        '/azure/10261-icon-service-Azure-DevOps.svg',
        '/azure/10264-icon-service-DevTest-Labs.svg',
        '/azure/02423-icon-service-Load-Testing.svg',
      ],
      title: t('services.items.devops.title'),
      description: t('services.items.devops.description'),
      technologies: [
        'Azure DevOps',
        'GitHub Actions',
        'Terraform',
        'Jenkins',
        'Helm',
        'GitOps',
        'Ansible',
        'Prometheus',
      ],
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      hoverGradient: 'hover:bg-gradient-to-br hover:from-primary/20 hover:to-accent/10',
      href: '/services/devops-platform-engineering',
    },
    {
      iconPath: [
        '/azure/10015-icon-service-Dashboard.svg',
        '/azure/00003-icon-service-Advisor.svg',
        '/azure/02189-icon-service-Azure-Workbooks.svg',
      ],
      title: t('services.items.digital.title'),
      description: t('services.items.digital.description'),
      technologies: [
        'Strategy',
        'Architecture',
        'Cloud Adoption',
        'Process Optimization',
        'Training',
        'Best Practices',
      ],
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      hoverGradient: 'hover:bg-gradient-to-br hover:from-primary/20 hover:to-accent/10',
      href: '/services/digital-transformation',
    },
  ]

  // Staggered reveal for the grid
  const { containerRef, isInView } = useStaggeredReveal({
    childCount: services.length,
    staggerDelay: 150,
    threshold: 0.2,
    rootMargin: '-100px',
  })

  // Trigger CRT glitch when section becomes visible
  useCRTEffect({
    sectionId: 'services',
    intensity: 'medium',
    isInView,
  })

  return (
    <section className="relative py-24 bg-gradient-to-b from-background via-primary/[0.04] to-background dark:from-background dark:via-background dark:to-background overflow-hidden">
      {/* Background decorative elements (dark only) */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none hidden dark:block" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl hidden dark:block" />

      {/* Scanline overlay for CRT feel (dark only) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015] hidden dark:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      {/* Container - centered, full width */}
      <div className="container mx-auto px-6 lg:px-8 relative z-30 max-w-7xl">
        <div>
          {/* Header - centered */}
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
            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block dark:hidden">
              {t('services.subtitle')}
            </span>
            <h2
              className={cn(
                designSystem.typography.heading.h1,
                'landing-section-heading text-4xl md:text-5xl font-bold text-foreground dark:text-foreground'
              )}
            >
              <span className="font-mono text-primary/70 text-2xl mb-2 hidden dark:block">
                {t('services.commentMarker')}
              </span>
              {t('services.title')}
            </h2>
            <p className={cn(designSystem.typography.body.large, 'landing-section-lead text-muted-foreground dark:text-muted-foreground')}>
              {t('services.description')}
            </p>
          </motion.div>

          {/* Service Cards Grid with staggered animation */}
          <motion.div
            ref={containerRef as React.RefObject<HTMLDivElement>}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {services.map((service) => (
              <motion.div key={service.title} variants={cardVariants} className="h-full">
                <ServiceCard
                  iconPath={service.iconPath}
                  title={service.title}
                  description={service.description}
                  color={service.color}
                  bgColor={service.bgColor}
                  hoverGradient={service.hoverGradient}
                  href={service.href}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Call to Action with reveal animation */}
          <motion.div
            className={cn(
              'relative rounded-2xl dark:rounded-3xl p-8 lg:p-12 text-center md:text-left overflow-hidden',
              // Light mode: clean neutral surface
              'bg-card/85 border border-border',
              // Dark mode: solid dark bg — gradient handled by overlay div inside
              'dark:bg-card dark:border-primary/20 dark:backdrop-blur-sm'
            )}
            initial={{ opacity: 0, y: designSystem.animation.motion.distance.slideUp }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
              duration: designSystem.animation.motion.duration.base,
              delay: 0.12,
              ease: designSystem.animation.motion.ease.out,
            }}
          >
            {/* Top accent bar — absolute div avoids border-radius curve artifacts */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary/80 dark:bg-primary/40" />

            {/* Gradient pulse overlay (dark only) */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse hidden dark:block" />

            {/* Terminal-style header decoration (dark only) */}
            <div className="absolute top-4 left-4 gap-1.5 opacity-40 hidden dark:flex">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <div className="w-3 h-3 rounded-full bg-accent" />
              <div className="w-3 h-3 rounded-full bg-primary" />
            </div>

            <div className="relative z-10">
              <h3
                className={cn(
                  designSystem.typography.heading.h2,
                  'mb-4 text-2xl lg:text-3xl font-bold',
                  'text-foreground dark:text-foreground'
                )}
              >
                {t('services.cta.title')}
              </h3>
              <p
                className={cn(
                  designSystem.typography.body.large,
                  'text-muted-foreground dark:text-muted-foreground',
                  'mb-8'
                )}
              >
                {t('services.cta.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    'landing-cta-primary'
                  )}
                >
                  <Link to={contactHref}>
                    {t('services.cta.primary')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    'landing-cta-secondary'
                  )}
                >
                  <Link to={contactHref}>
                    {t('services.cta.secondary')}
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
