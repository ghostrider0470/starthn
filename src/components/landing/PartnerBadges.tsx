import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { designSystem } from '@/lib/design-system'
import { LogoLoop } from '@/components/LogoLoop'
import { cn } from '@/lib/utils'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useCRTEffect } from '@/hooks/useCRTEffect'
import { Trans, useTranslation } from 'react-i18next'
import { VscAzure, VscAzureDevops, VscCode, VscGithub } from 'react-icons/vsc'
import { DiMsqlServer } from 'react-icons/di'
import { FaAws } from 'react-icons/fa'
import {
  SiGooglecloud,
  SiDocker,
  SiKubernetes,
  SiReact,
  SiTypescript,
  SiNodedotjs,
  SiNextdotjs,
  SiDotnet,
  SiSharp,
  SiPostgresql,
  SiRedis,
  SiAngular,
  SiVuedotjs,
  SiTailwindcss,
  SiVite,
  SiMongodb,
  SiElasticsearch,
  SiTerraform,
  SiJenkins,
  SiGraphql,
  SiGit,
  SiPython,
  SiCplusplus,
  SiJavascript,
  SiC,
} from 'react-icons/si'
import type { IconType } from 'react-icons'

// ---------------------------------------------------------------------------
// Category card data
// ---------------------------------------------------------------------------
interface TechItem {
  name: string
  icon: IconType
  color: string
  darkColor?: string
}

interface TechCategory {
  label: string
  description: string
  items: TechItem[]
}

// ---------------------------------------------------------------------------
// Logo carousel data (all logos flat for 3 scrolling rows)
// ---------------------------------------------------------------------------
const allLogos = [
  { node: <div className="flex items-center gap-3 text-[#0078D7]"><VscAzure className="w-8 h-8" /><span className="font-semibold">Azure</span></div>, ariaLabel: 'Azure', title: 'Cloud Infrastructure' },
  { node: <div className="flex items-center gap-3 text-[#FF9900]"><FaAws className="w-8 h-8" /><span className="font-semibold">AWS</span></div>, ariaLabel: 'AWS', title: 'Cloud Platform' },
  { node: <div className="flex items-center gap-3 text-[#4285F4]"><SiGooglecloud className="w-8 h-8" /><span className="font-semibold">Google Cloud</span></div>, ariaLabel: 'Google Cloud', title: 'Cloud Platform' },
  { node: <div className="flex items-center gap-3 text-[#2496ED]"><SiDocker className="w-8 h-8" /><span className="font-semibold">Docker</span></div>, ariaLabel: 'Docker', title: 'Containers' },
  { node: <div className="flex items-center gap-3 text-[#326CE5]"><SiKubernetes className="w-8 h-8" /><span className="font-semibold">Kubernetes</span></div>, ariaLabel: 'Kubernetes', title: 'Orchestration' },
  { node: <div className="flex items-center gap-3 text-[#7B42BC]"><SiTerraform className="w-8 h-8" /><span className="font-semibold">Terraform</span></div>, ariaLabel: 'Terraform', title: 'IaC' },
  { node: <div className="flex items-center gap-3 text-[#61DAFB]"><SiReact className="w-8 h-8" /><span className="font-semibold">React</span></div>, ariaLabel: 'React', title: 'Frontend' },
  { node: <div className="flex items-center gap-3 text-[#3178C6]"><SiTypescript className="w-8 h-8" /><span className="font-semibold">TypeScript</span></div>, ariaLabel: 'TypeScript', title: 'Type Safety' },
  { node: <div className="flex items-center gap-3 text-[#DD0031]"><SiAngular className="w-8 h-8" /><span className="font-semibold">Angular</span></div>, ariaLabel: 'Angular', title: 'Enterprise Frontend' },
  { node: <div className="flex items-center gap-3 text-[#F7DF1E]"><SiJavascript className="w-8 h-8" /><span className="font-semibold">JavaScript</span></div>, ariaLabel: 'JavaScript', title: 'Web Language' },
  { node: <div className="flex items-center gap-3 text-[#4FC08D]"><SiVuedotjs className="w-8 h-8" /><span className="font-semibold">Vue.js</span></div>, ariaLabel: 'Vue.js', title: 'Progressive Framework' },
  { node: <div className="flex items-center gap-3 text-foreground"><SiNextdotjs className="w-8 h-8" /><span className="font-semibold">Next.js</span></div>, ariaLabel: 'Next.js', title: 'Full-Stack React' },
  { node: <div className="flex items-center gap-3 text-[#06B6D4]"><SiTailwindcss className="w-8 h-8" /><span className="font-semibold">Tailwind CSS</span></div>, ariaLabel: 'Tailwind CSS', title: 'Utility CSS' },
  { node: <div className="flex items-center gap-3 text-[#646CFF]"><SiVite className="w-8 h-8" /><span className="font-semibold">Vite</span></div>, ariaLabel: 'Vite', title: 'Build Tool' },
  { node: <div className="flex items-center gap-3 text-[#512BD4]"><SiDotnet className="w-8 h-8" /><span className="font-semibold">.NET</span></div>, ariaLabel: '.NET', title: 'Enterprise Platform' },
  { node: <div className="flex items-center gap-3 text-[#239120]"><SiSharp className="w-8 h-8" /><span className="font-semibold">C#</span></div>, ariaLabel: 'C#', title: 'OOP' },
  { node: <div className="flex items-center gap-3 text-[#3776AB]"><SiPython className="w-8 h-8" /><span className="font-semibold">Python</span></div>, ariaLabel: 'Python', title: 'General Purpose' },
  { node: <div className="flex items-center gap-3 text-[#339933]"><SiNodedotjs className="w-8 h-8" /><span className="font-semibold">Node.js</span></div>, ariaLabel: 'Node.js', title: 'Backend JS' },
  { node: <div className="flex items-center gap-3 text-[#A8B9CC]"><SiC className="w-8 h-8" /><span className="font-semibold">C</span></div>, ariaLabel: 'C', title: 'Systems Language' },
  { node: <div className="flex items-center gap-3 text-[#00599C]"><SiCplusplus className="w-8 h-8" /><span className="font-semibold">C++</span></div>, ariaLabel: 'C++', title: 'Systems Language' },
  { node: <div className="flex items-center gap-3 text-[#E10098]"><SiGraphql className="w-8 h-8" /><span className="font-semibold">GraphQL</span></div>, ariaLabel: 'GraphQL', title: 'Modern API' },
  { node: <div className="flex items-center gap-3 text-[#CC2927]"><DiMsqlServer className="w-8 h-8" /><span className="font-semibold">SQL Server</span></div>, ariaLabel: 'SQL Server', title: 'Enterprise DB' },
  { node: <div className="flex items-center gap-3 text-[#336791]"><SiPostgresql className="w-8 h-8" /><span className="font-semibold">PostgreSQL</span></div>, ariaLabel: 'PostgreSQL', title: 'Relational DB' },
  { node: <div className="flex items-center gap-3 text-[#47A248]"><SiMongodb className="w-8 h-8" /><span className="font-semibold">MongoDB</span></div>, ariaLabel: 'MongoDB', title: 'Document DB' },
  { node: <div className="flex items-center gap-3 text-[#DC382D]"><SiRedis className="w-8 h-8" /><span className="font-semibold">Redis</span></div>, ariaLabel: 'Redis', title: 'In-Memory Store' },
  { node: <div className="flex items-center gap-3 text-[#005571] dark:text-[#00BFB3]"><SiElasticsearch className="w-8 h-8" /><span className="font-semibold">Elasticsearch</span></div>, ariaLabel: 'Elasticsearch', title: 'Search Engine' },
  { node: <div className="flex items-center gap-3 text-[#181717] dark:text-foreground"><VscGithub className="w-8 h-8" /><span className="font-semibold">GitHub</span></div>, ariaLabel: 'GitHub', title: 'Version Control' },
  { node: <div className="flex items-center gap-3 text-[#0078D7]"><VscAzureDevops className="w-8 h-8" /><span className="font-semibold">Azure DevOps</span></div>, ariaLabel: 'Azure DevOps', title: 'CI/CD' },
  { node: <div className="flex items-center gap-3 text-[#D33833]"><SiJenkins className="w-8 h-8" /><span className="font-semibold">Jenkins</span></div>, ariaLabel: 'Jenkins', title: 'CI' },
  { node: <div className="flex items-center gap-3 text-[#F05032]"><SiGit className="w-8 h-8" /><span className="font-semibold">Git</span></div>, ariaLabel: 'Git', title: 'VCS' },
  { node: <div className="flex items-center gap-3 text-[#007ACC]"><VscCode className="w-8 h-8" /><span className="font-semibold">VS Code</span></div>, ariaLabel: 'VS Code', title: 'IDE' },
]

// Split into 3 balanced rows
const row1 = allLogos.slice(0, 11)
const row2 = allLogos.slice(11, 21)
const row3 = allLogos.slice(21)

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
export function PartnerBadges() {
  const { t } = useTranslation('landing')
  const [showTuning, setShowTuning] = useState(true)
  const [showLogos, setShowLogos] = useState(false)

  const { ref: sectionRef, isInView } = useScrollReveal({
    threshold: 0.15,
    rootMargin: '-100px',
  })

  useCRTEffect({
    sectionId: 'partners',
    intensity: 'subtle',
    isInView,
  })

  const categories: TechCategory[] = [
    {
      label: t('partners.categories.cloudInfra.label'),
      description: t('partners.categories.cloudInfra.description'),
      items: [
        { name: 'Azure', icon: VscAzure, color: '#0078D7' },
        { name: 'AWS', icon: FaAws, color: '#FF9900' },
        { name: 'Google Cloud', icon: SiGooglecloud, color: '#4285F4' },
        { name: 'Docker', icon: SiDocker, color: '#2496ED' },
        { name: 'Kubernetes', icon: SiKubernetes, color: '#326CE5' },
        { name: 'Terraform', icon: SiTerraform, color: '#7B42BC' },
      ],
    },
    {
      label: t('partners.categories.frontend.label'),
      description: t('partners.categories.frontend.description'),
      items: [
        { name: 'React', icon: SiReact, color: '#61DAFB' },
        { name: 'TypeScript', icon: SiTypescript, color: '#3178C6' },
        { name: 'Angular', icon: SiAngular, color: '#DD0031' },
        { name: 'Vue.js', icon: SiVuedotjs, color: '#4FC08D' },
        { name: 'Next.js', icon: SiNextdotjs, color: '#181717', darkColor: '#ffffff' },
        { name: 'Tailwind CSS', icon: SiTailwindcss, color: '#06B6D4' },
        { name: 'Vite', icon: SiVite, color: '#646CFF' },
        { name: 'JavaScript', icon: SiJavascript, color: '#F7DF1E', darkColor: '#F7DF1E' },
      ],
    },
    {
      label: t('partners.categories.backend.label'),
      description: t('partners.categories.backend.description'),
      items: [
        { name: '.NET', icon: SiDotnet, color: '#512BD4' },
        { name: 'C#', icon: SiSharp, color: '#239120' },
        { name: 'Python', icon: SiPython, color: '#3776AB' },
        { name: 'Node.js', icon: SiNodedotjs, color: '#339933' },
        { name: 'C', icon: SiC, color: '#A8B9CC', darkColor: '#A8B9CC' },
        { name: 'C++', icon: SiCplusplus, color: '#00599C' },
        { name: 'GraphQL', icon: SiGraphql, color: '#E10098' },
      ],
    },
    {
      label: t('partners.categories.data.label'),
      description: t('partners.categories.data.description'),
      items: [
        { name: 'SQL Server', icon: DiMsqlServer, color: '#CC2927' },
        { name: 'PostgreSQL', icon: SiPostgresql, color: '#336791' },
        { name: 'MongoDB', icon: SiMongodb, color: '#47A248' },
        { name: 'Redis', icon: SiRedis, color: '#DC382D' },
        { name: 'Elasticsearch', icon: SiElasticsearch, color: '#005571', darkColor: '#00BFB3' },
      ],
    },
    {
      label: t('partners.categories.devops.label'),
      description: t('partners.categories.devops.description'),
      items: [
        { name: 'GitHub', icon: VscGithub, color: '#181717', darkColor: '#ffffff' },
        { name: 'Azure DevOps', icon: VscAzureDevops, color: '#0078D7' },
        { name: 'Jenkins', icon: SiJenkins, color: '#D33833' },
        { name: 'Git', icon: SiGit, color: '#F05032' },
        { name: 'VS Code', icon: VscCode, color: '#007ACC' },
      ],
    },
  ]

  // Channel tuning sequence for carousel
  useEffect(() => {
    if (!isInView) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setShowTuning(false)
      setShowLogos(true)
      return
    }

    const tuningTimer = setTimeout(() => {
      setShowTuning(false)
      setShowLogos(true)
    }, 500)

    return () => clearTimeout(tuningTimer)
  }, [isInView])

  return (
    <section
      className={cn(
        'relative py-24 overflow-hidden',
        'bg-gradient-to-b from-background via-accent/[0.04] to-background dark:from-background dark:via-background dark:to-background'
      )}
    >
      {/* ── Dark-only background decorations ───────────────────────── */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none hidden dark:block" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015] hidden dark:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl hidden dark:block" />

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
          {/* Light subtitle */}
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block dark:hidden">
            {t('partners.subtitle')}
          </span>

          <h2
            className={cn(
              designSystem.typography.heading.h1,
              'landing-section-heading text-4xl md:text-5xl font-bold text-foreground dark:text-foreground'
            )}
          >
            {/* Dark monospace marker */}
            <span className="font-mono text-primary/70 text-2xl mb-2 hidden dark:block">
              {t('partners.commentMarker')}
            </span>
            <Trans
              t={t}
              i18nKey="partners.title"
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
            {t('partners.description')}
          </p>
        </motion.div>

        {/* ── Category Cards ───────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-14 md:mb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {categories.map((category) => (
            <motion.div
              key={category.label}
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
              {/* Category label */}
              <span
                className={cn(
                  'text-xs font-medium uppercase tracking-wider block mb-2',
                  'text-muted-foreground/80',
                  'dark:text-primary/70 dark:font-mono'
                )}
              >
                {category.label}
              </span>

              {/* Category description */}
              <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed mb-5">
                {category.description}
              </p>

              {/* Tech items grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {category.items.map((tech) => {
                  const Icon = tech.icon
                  return (
                    <div
                      key={tech.name}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors duration-200',
                        'bg-secondary/70 hover:bg-secondary',
                        'dark:bg-primary/5 dark:hover:bg-primary/10'
                      )}
                    >
                      {tech.darkColor ? (
                        <>
                          <Icon className="w-5 h-5 shrink-0 dark:hidden" style={{ color: tech.color }} />
                          <Icon className="w-5 h-5 shrink-0 hidden dark:block" style={{ color: tech.darkColor }} />
                        </>
                      ) : (
                        <Icon className="w-5 h-5 shrink-0" style={{ color: tech.color }} />
                      )}
                      <span className="text-sm font-medium text-foreground/80 dark:text-foreground/80 truncate">
                        {tech.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Logo Carousel ────────────────────────────────────────── */}
        <div
          className="mb-16 space-y-8 relative"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          }}
        >
          {/* TV static tuning overlay */}
          {showTuning && isInView && (
            <motion.div
              className="absolute inset-0 z-10 pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div
                className="absolute inset-0 animate-channel-tune"
                style={{
                  background: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" /></filter><rect width="200" height="200" filter="url(%23noise)" opacity="0.5"/></svg>')`,
                  backgroundSize: '150px 150px',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-primary text-xl animate-blink">
                  {t('partners.scanning')}
                </span>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={showLogos ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: designSystem.animation.motion.duration.base }}
          >
            <LogoLoop logos={row1} speed={40} direction="left" logoHeight={48} gap={80} pauseOnHover scaleOnHover ariaLabel={t('partners.logoRows.row1Aria')} className="py-4" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={showLogos ? { opacity: 1 } : { opacity: 0 }}
            transition={{
              duration: designSystem.animation.motion.duration.base,
              delay: 0.1,
            }}
          >
            <LogoLoop logos={row2} speed={35} direction="right" logoHeight={48} gap={80} pauseOnHover scaleOnHover ariaLabel={t('partners.logoRows.row2Aria')} className="py-4" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={showLogos ? { opacity: 1 } : { opacity: 0 }}
            transition={{
              duration: designSystem.animation.motion.duration.base,
              delay: 0.2,
            }}
          >
            <LogoLoop logos={row3} speed={45} direction="left" logoHeight={48} gap={80} pauseOnHover scaleOnHover ariaLabel={t('partners.logoRows.row3Aria')} className="py-4" />
          </motion.div>
        </div>

        {/* ── Summary Strip ────────────────────────────────────────── */}
        <motion.div
          className={cn(
            'relative rounded-2xl overflow-hidden',
            'bg-card/85 border border-border',
            'dark:bg-card dark:border-primary/20'
          )}
          initial={{ opacity: 0, y: designSystem.animation.motion.distance.slideUp }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{
            duration: designSystem.animation.motion.duration.base,
            delay: 0.1,
            ease: designSystem.animation.motion.ease.out,
          }}
        >
          <div className="h-[3px] bg-primary/80 dark:bg-primary/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse hidden dark:block" />
          <div className="absolute top-5 left-5 gap-1.5 opacity-40 hidden dark:flex">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <div className="w-3 h-3 rounded-full bg-accent" />
            <div className="w-3 h-3 rounded-full bg-primary" />
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 p-8 lg:p-10">
            {[
              { title: t('partners.summary.cloudNative.title'), desc: t('partners.summary.cloudNative.description') },
              { title: t('partners.summary.fullStack.title'), desc: t('partners.summary.fullStack.description') },
              { title: t('partners.summary.productionProven.title'), desc: t('partners.summary.productionProven.description') },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: designSystem.animation.motion.distance.slideUp }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: designSystem.animation.motion.duration.fast,
                  delay: 0.08 + i * 0.06,
                  ease: designSystem.animation.motion.ease.out,
                }}
              >
                <h3 className="font-bold text-foreground dark:text-foreground mb-1 text-base">{item.title}</h3>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
