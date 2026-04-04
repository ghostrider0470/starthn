import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import {
  Sparkles,
  Globe,
  Network,
  Link2,
  Video,
  FileText,
  Github,
  ArrowRight,
  Zap
} from 'lucide-react'

const demos = [
  {
    id: 'genetic-algorithm',
    title: 'Genetic Algorithm Simulation',
    description: 'Experience natural selection in action — watch creatures evolve camouflage in real-time',
    icon: Sparkles,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    tags: ['AI', 'Machine Learning', 'Optimization'],
    comingSoon: false,
    href: '/innovation-lab/genetic-algorithm'
  },
  {
    id: 'nlp',
    title: 'Multi-Language NLP',
    description: 'Analyze sentiment, detect languages, extract entities, and translate text in real-time',
    icon: Globe,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    tags: ['NLP', 'Machine Learning', 'Translation'],
    comingSoon: false,
    href: '/innovation-lab/nlp'
  },
  {
    id: 'load-balancer',
    title: 'Global Load Balancer',
    description: 'Interactive visualization of distributed systems and traffic routing',
    icon: Network,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    tags: ['DevOps', 'Cloud', 'Distributed Systems'],
    comingSoon: true
  },
  {
    id: 'blockchain',
    title: 'Blockchain Transaction Visualizer',
    description: 'Real-time visualization of blockchain transactions and consensus',
    icon: Link2,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    tags: ['Blockchain', 'Web3', 'Cryptography'],
    comingSoon: true
  },
  {
    id: 'webrtc',
    title: 'Real-time Collaboration',
    description: 'WebRTC-powered video conferencing and screen sharing demo',
    icon: Video,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    tags: ['WebRTC', 'Real-time', 'P2P'],
    comingSoon: true
  }
]

const resources = [
  {
    title: 'Open Source Contributions',
    description: 'Explore our contributions to the open-source community',
    icon: Github,
    href: '#',
    stats: '25+ repositories',
    color: 'text-primary'
  },
  {
    title: 'Research Papers',
    description: 'Academic publications and technical white papers',
    icon: FileText,
    href: '#',
    stats: '12 publications',
    color: 'text-accent'
  },
  {
    title: 'Innovation Blog',
    description: 'Latest insights on emerging technologies',
    icon: Zap,
    href: '#',
    stats: '50+ articles',
    color: 'text-primary'
  }
]

export function InnovationLab() {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null)

  const handleCardClick = (demo: typeof demos[0]) => {
    if (demo.href && !demo.comingSoon) {
      // Navigation will be handled by the Link component
      return
    }
    setSelectedDemo(demo.id)
  }

  return (
    <section className="relative py-24 bg-background overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <PageContainer>
        <div className="max-w-7xl mx-auto">
          {/* Interactive Demos Grid */}
          <div className="mb-20">
            <h3 className={cn(designSystem.typography.heading.h3, "text-2xl font-bold mb-8 text-center")}>
              Interactive Demos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {demos.map((demo) => {
                const Icon = demo.icon
                const CardWrapper = demo.href && !demo.comingSoon ? Link : 'div'
                const cardProps = demo.href && !demo.comingSoon
                  ? { to: demo.href }
                  : { onClick: () => handleCardClick(demo) }

                return (
                  <CardWrapper key={demo.id} {...cardProps}>
                    <Card
                      className={cn(
                        "relative group cursor-pointer transition-all duration-300",
                        "hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-2",
                        "border-border/50 hover:border-primary/50",
                        selectedDemo === demo.id && "ring-2 ring-primary",
                        "h-full"
                      )}
                    >
                    {demo.comingSoon && (
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-accent/80 text-accent-foreground text-xs font-medium">
                        Coming Soon
                      </div>
                    )}

                    <CardHeader>
                      <div className={cn(
                        "inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4",
                        "transition-all duration-300 group-hover:scale-110",
                        demo.bgColor
                      )}>
                        <Icon className={cn("h-6 w-6", demo.color)} />
                      </div>
                      <CardTitle className="text-lg">{demo.title}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {demo.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {demo.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs rounded-full bg-muted/80 text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2 rounded-lg",
                          "transition-all duration-300",
                          "group-hover:bg-primary group-hover:text-primary-foreground",
                          demo.comingSoon && "opacity-50"
                        )}
                      >
                        <span className="font-medium">{demo.comingSoon ? 'Coming Soon' : 'Try Demo'}</span>
                        {!demo.comingSoon && (
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </CardWrapper>
                )
              })}
            </div>
          </div>

          {/* Resources Section */}
          <div>
            <h3 className={cn(designSystem.typography.heading.h3, "text-2xl font-bold mb-8 text-center")}>
              Resources & Research
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {resources.map((resource) => {
                const Icon = resource.icon
                return (
                  <Card
                    key={resource.title}
                    className={cn(
                      "group cursor-pointer transition-all duration-300",
                      "hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-2",
                      "border-border/50 hover:border-primary/50"
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-4">
                        <Icon className={cn("h-8 w-8", resource.color)} />
                        <span className="text-xs font-medium text-muted-foreground">
                          {resource.stats}
                        </span>
                      </div>
                      <CardTitle className="text-lg mb-2">{resource.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {resource.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="ghost"
                        className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        <span>Explore</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  )
}
