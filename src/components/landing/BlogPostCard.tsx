import { Calendar, Clock, User, ArrowRight, FileText } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { StandardCard } from '@/components/ui/standard-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type BlogPost = {
  id: string
  title: string
  excerpt: string
  author: {
    name: string
    avatar?: string
  }
  date: string
  readTime: string
  category: string
  tags: string[]
  image?: string
}

interface BlogPostCardProps {
  post: BlogPost
  featured?: boolean
}

export function BlogPostCard({ post, featured = false }: BlogPostCardProps) {
  if (featured) {
    return (
      <StandardCard variant="hover" className="overflow-hidden group">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Placeholder */}
          <div className="aspect-video md:aspect-auto bg-gradient-to-br from-primary/10 via-muted/30 to-accent/10 rounded-lg flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 opacity-30">
              <FileText className="h-14 w-14 text-primary/60" strokeWidth={1.5} />
              <span className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wider">
                {post.category}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="mb-3 w-fit">
              {post.category}
            </Badge>
            <h2 className={cn(designSystem.typography.heading.h3, "mb-4 group-hover:text-primary transition-colors")}>
              {post.title}
            </h2>
            <p className={cn(designSystem.typography.body.base, designSystem.typography.muted, "mb-4")}>
              {post.excerpt}
            </p>

            <div className="flex items-center gap-4 mb-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span className={designSystem.typography.body.small}>{post.author.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className={designSystem.typography.body.small}>{post.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className={designSystem.typography.body.small}>{post.readTime}</span>
              </div>
            </div>

            <Button variant="outline" className="w-fit">
              Read Article
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </StandardCard>
    )
  }

  return (
    <StandardCard variant="hover" className="h-full flex flex-col group">
      {/* Image Placeholder */}
      <div className="aspect-video bg-gradient-to-br from-primary/5 via-muted/50 to-accent/5 rounded-lg flex items-center justify-center mb-4">
        <div className="flex flex-col items-center gap-2 opacity-30">
          <FileText className="h-10 w-10 text-primary/60" strokeWidth={1.5} />
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
            {post.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <Badge variant="secondary" className="mb-3 w-fit">
          {post.category}
        </Badge>
        <h3 className={cn(designSystem.typography.heading.h5, "mb-3 group-hover:text-primary transition-colors line-clamp-2")}>
          {post.title}
        </h3>
        <p className={cn(designSystem.typography.body.small, designSystem.typography.muted, "mb-4 line-clamp-3")}>
          {post.excerpt}
        </p>

        <div className="flex items-center gap-3 text-muted-foreground mt-auto pt-4 border-t">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className={cn(designSystem.typography.body.small, "text-xs")}>{post.author.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span className={cn(designSystem.typography.body.small, "text-xs")}>{post.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className={cn(designSystem.typography.body.small, "text-xs")}>{post.readTime}</span>
          </div>
        </div>
      </div>
    </StandardCard>
  )
}
