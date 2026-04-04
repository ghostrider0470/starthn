import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BlogPost } from '@/data/blog-posts'
import type { SupportedLocale } from '@/lib/i18n-utils'
import { localizeBlogCategory, localizeBlogTag, localizeBlogReadTime } from '@/lib/blog-i18n'
import { usePublicCategories } from '@/hooks/useCategoryQueries'
import { usePublicTags } from '@/hooks/useTagQueries'
import { designSystem } from '@/lib/design-system'
import { withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

interface BlogPostCardProps {
  post: BlogPost
  locale: SupportedLocale
  className?: string
  compact?: boolean
}

function formatPublishedDate(date: string, locale: SupportedLocale): string {
  return new Date(date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BlogPostCard({
  post,
  locale,
  className,
  compact = false,
}: BlogPostCardProps) {
  const { t } = useTranslation()
  const { data: categories = [] } = usePublicCategories()
  const { data: tags = [] } = usePublicTags()
  const postHref = withLocalePath(`/blog/${post.slug}`, locale)
  const displayTags = (post.tags ?? []).slice(0, 2)

  return (
    <Link to={postHref} className={cn('group block h-full', className)}>
      <article
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground',
          'transition-all duration-300',
          'hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30',
          'hover:-translate-y-1',
        )}
      >
        {/* Image */}
        <div
          className={cn(
            'relative aspect-[16/9] w-full overflow-hidden',
            !post.coverImage && 'bg-gradient-to-br from-primary/8 via-muted/40 to-accent/8',
          )}
        >
          {post.coverImage ? (
            <img
              src={post.coverImage}
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="h-12 w-12 text-primary/20" strokeWidth={1} />
            </div>
          )}
          {/* Gradient overlay for badge readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {/* Category badge on image */}
          <span className="absolute bottom-3 left-3 rounded-full bg-primary/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground backdrop-blur-sm">
            {localizeBlogCategory(categories, post.category, locale)}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* Meta line */}
          <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground">
            <time dateTime={post.publishedAt}>
              {formatPublishedDate(post.publishedAt, locale)}
            </time>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {localizeBlogReadTime(t, post.readTime)}
            </span>
          </div>

          {/* Title */}
          <h3
            className={cn(
              compact ? 'text-base font-semibold' : 'text-lg font-bold',
              'mb-2 leading-snug tracking-tight',
              'transition-colors group-hover:text-primary',
              'line-clamp-2',
            )}
          >
            {post.title}
          </h3>

          {/* Excerpt */}
          {!compact && (
            <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {post.excerpt}
            </p>
          )}

          {/* Tags */}
          {displayTags.length > 0 && !compact && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {displayTags.map((tagSlug) => (
                <span
                  key={tagSlug}
                  className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {localizeBlogTag(tags, tagSlug, locale)}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/40">
            <div className="flex items-center gap-2 min-w-0">
              {post.authorAvatarUrl ? (
                <img
                  src={post.authorAvatarUrl}
                  alt={post.author}
                  className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border/50"
                />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary ring-1 ring-primary/20">
                  {post.author
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
              <span className="truncate text-xs font-medium text-foreground/80">
                {post.author}
              </span>
            </div>

            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary',
                'opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0',
              )}
            >
              {t('blogCard.read')}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
