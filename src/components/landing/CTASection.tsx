import { ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

export function CTASection() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle email submission
    console.log('Email submitted:', email)
    setEmail('')
  }

  return (
    <section className="relative overflow-hidden section">
      {/* Brand gradient: warm orange→purple in light, subtle dark tint in dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-accent/15 dark:from-secondary/20 dark:to-accent/10" />
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="container relative mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Ready to Build Something Exceptional?
        </h2>
        <p className="mb-8 text-lg text-muted-foreground">
          Partner with Horizon Tech to bring your next project to life.
          Modern architecture, proven expertise, delivered on time.
        </p>

        <form onSubmit={handleSubmit} className="mx-auto max-w-md">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-background text-foreground"
              required
            />
            <Button type="submit" size="lg">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free trial available. No credit card required.
          </p>
        </form>

        <div className="mt-12 flex flex-wrap justify-center gap-8 text-foreground/90 dark:text-foreground/80">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span>Weekly updates</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔒</span>
            <span>No spam, ever</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span>Early access</span>
          </div>
        </div>
      </div>
    </section>
  )
}
