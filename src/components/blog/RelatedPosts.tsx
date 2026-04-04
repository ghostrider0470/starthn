import { useTranslation } from 'react-i18next'
import { BlogPostCard } from './BlogPostCard'
import { StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import type { BlogPost } from '@/data/blog-posts'
import type { SupportedLocale } from '@/lib/i18n-utils'
import { useRelatedBlogPosts } from '@/hooks/useBlogQueries'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface RelatedPostsProps {
  currentPost: BlogPost
  locale: SupportedLocale
}

export function RelatedPosts({ currentPost, locale }: RelatedPostsProps) {
  const { t } = useTranslation('blog')
  const { data: relatedPosts = [] } = useRelatedBlogPosts(locale, currentPost.category, currentPost.slug)

  if (relatedPosts.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
        {t('relatedPosts')}
      </h2>
      <StaggerContainer
        className={cn(
          designSystem.grid.responsive.three,
          designSystem.spacing.gap.lg,
        )}
      >
        {relatedPosts.map((post) => (
          <StaggerItem key={post.slug}>
            <BlogPostCard post={post} locale={locale} compact />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  )
}
