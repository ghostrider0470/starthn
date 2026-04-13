import { BlogPostCard } from './BlogPostCard'
import type { BlogPost } from './BlogPostCard'
import { StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface BlogGridProps {
  posts: BlogPost[]
  featured?: BlogPost
}

export function BlogGrid({ posts, featured }: BlogGridProps) {
  return (
    <div className="space-y-12">
      {/* Featured Post */}
      {featured && (
        <div className="mb-12">
          <BlogPostCard post={featured} featured />
        </div>
      )}

      {/* Regular Posts Grid */}
      <StaggerContainer
        className={cn(designSystem.grid.responsive.three, designSystem.spacing.gap.lg)}
        staggerChildren={designSystem.animation.motion.stagger.cards}
      >
        {posts.map((post) => (
          <StaggerItem key={post.id}>
            <BlogPostCard post={post} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  )
}
