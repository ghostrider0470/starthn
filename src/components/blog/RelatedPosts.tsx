import { useTranslation } from 'react-i18next'
import { BlogPostCard } from './BlogPostCard'
import type { BlogPost } from '@/data/blog-posts'
import type { SupportedLocale } from '@/lib/i18n-utils'
import { useRelatedBlogPosts } from '@/hooks/useBlogQueries'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface RelatedPostsProps {
  currentPost: BlogPost
  locale: SupportedLocale
  /**
   * Related posts loaded by the route loader (SSR). When present they are
   * rendered directly, so the block is in the server HTML and no client
   * fetch is needed.
   */
  initialRelated?: Array<BlogPost>
}

export function RelatedPosts({
  currentPost,
  locale,
  initialRelated,
}: RelatedPostsProps) {
  if (initialRelated) {
    return <RelatedPostsList posts={initialRelated} locale={locale} />
  }
  return <FetchedRelatedPosts currentPost={currentPost} locale={locale} />
}

function FetchedRelatedPosts({
  currentPost,
  locale,
}: Omit<RelatedPostsProps, 'initialRelated'>) {
  const { data: relatedPosts = [] } = useRelatedBlogPosts(
    locale,
    currentPost.category,
    currentPost.slug,
  )
  return <RelatedPostsList posts={relatedPosts} locale={locale} />
}

// Plain markup, no reveal animation: nothing here is server-rendered with
// opacity:0.
function RelatedPostsList({
  posts,
  locale,
}: {
  posts: Array<BlogPost>
  locale: SupportedLocale
}) {
  const { t } = useTranslation('blog')

  if (posts.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className={cn(designSystem.typography.heading.h3, 'mb-4')}>
        {t('relatedPosts')}
      </h2>
      <div
        className={cn(
          designSystem.grid.responsive.three,
          designSystem.spacing.gap.lg,
        )}
      >
        {posts.map((post) => (
          <div key={post.slug}>
            <BlogPostCard post={post} locale={locale} compact />
          </div>
        ))}
      </div>
    </section>
  )
}
