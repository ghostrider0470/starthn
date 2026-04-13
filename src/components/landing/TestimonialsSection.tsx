import { Star, Quote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'CTO, FinEdge Technologies',
    avatar: 'SC',
    content:
      'Start HN modernized our entire payment processing architecture. We went from 200ms to 15ms response times — a game-changer for our real-time trading platform.',
    rating: 5,
  },
  {
    name: 'Michael Rodriguez',
    role: 'VP of Engineering, DataStream Inc.',
    avatar: 'MR',
    content:
      'Their cloud migration expertise saved us months of work. The team handled our AWS-to-Azure transition with zero downtime and 40% cost reduction.',
    rating: 5,
  },
  {
    name: 'Emma Thompson',
    role: 'Product Director, NexGen Retail',
    avatar: 'ET',
    content:
      'The custom inventory management system Start HN built handles 10x our previous throughput. Their microservices approach was exactly what we needed.',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'Engineering Director, ClearView Analytics',
    avatar: 'DK',
    content:
      'Start HN delivered an AI-powered analytics dashboard that transformed how we serve clients. Their technical depth and business understanding are unmatched.',
    rating: 5,
  },
  {
    name: 'Lisa Anderson',
    role: 'Head of Platform, ScaleUp Logistics',
    avatar: 'LA',
    content:
      'Our IoT fleet management platform needed a complete overhaul. Start HN designed a system that scales to 50,000 devices with real-time telemetry.',
    rating: 5,
  },
  {
    name: 'James Wilson',
    role: 'CTO, Meridian Health Systems',
    avatar: 'JW',
    content:
      'The DevOps pipeline Start HN implemented cut our deployment cycles from weeks to hours. Their CI/CD expertise is world-class.',
    rating: 5,
  },
]

export function TestimonialsSection() {
  return (
    <section className="bg-secondary/30 px-4 py-24">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Trusted by Technology Leaders
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            See what engineering leaders say about partnering with Start HN
            on their most critical projects
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="relative overflow-hidden border-muted/50"
            >
              <Quote className="absolute right-4 top-4 h-8 w-8 text-muted/20" />
              <CardContent className="p-6">
                <div className="mb-4 flex">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-primary text-primary"
                    />
                  ))}
                </div>

                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  "{testimonial.content}"
                </p>

                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={`https://avatar.vercel.sh/${testimonial.name}`}
                    />
                    <AvatarFallback>{testimonial.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-8 text-center">
          <div>
            <p className="text-3xl font-bold">200+</p>
            <p className="text-sm text-muted-foreground">
              Projects Delivered
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold">50+</p>
            <p className="text-sm text-muted-foreground">Enterprise Clients</p>
          </div>
          <div>
            <p className="text-3xl font-bold">4.9/5</p>
            <p className="text-sm text-muted-foreground">Client Satisfaction</p>
          </div>
          <div>
            <p className="text-3xl font-bold">24/7</p>
            <p className="text-sm text-muted-foreground">Support</p>
          </div>
        </div>
      </div>
    </section>
  )
}
