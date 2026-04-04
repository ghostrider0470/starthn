import { CalendarDays, Clock3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BlogProseContent } from '@/components/blog/BlogProseContent'
import { designSystem } from '@/lib/design-system'
import { withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

export interface BlogPostPreviewProps {
  title: string
  excerpt: string
  author: string
  category: string
  publishedAt: string
  readTime: string
  /** HTML string for rich content (from editor) */
  htmlContent?: string
  /** Raw content array (from database — may be HTML or plain paragraphs) */
  content?: string[]
  tags: string[]
  authorSlug?: string
  authorAvatarUrl?: string
  locale?: string
  /** Text direction for the article content — defaults to 'auto' */
  dir?: 'rtl' | 'ltr' | 'auto'
  className?: string
  coverImage?: string
  bannerImage?: string
}

function getAuthorInitials(author: string): string {
  if (!author) return '?'
  return author
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatPublishedDate(date: string, locale?: string): string {
  if (!date) return ''
  return new Date(date.includes('T') ? date : `${date}T00:00:00`).toLocaleDateString(
    locale ?? 'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' },
  )
}

export function BlogPostPreview({
  title,
  excerpt,
  author,
  category,
  publishedAt,
  readTime,
  htmlContent,
  content: rawContent,
  tags,
  authorSlug,
  authorAvatarUrl,
  locale,
  dir = 'auto',
  className,
  coverImage,
  bannerImage,
}: BlogPostPreviewProps) {
  // TODO: add "author.role", "tags.heading", and "editor.emptyPreview" keys to the blog namespace JSON on CDN
  const { t } = useTranslation('blog')
  const content = rawContent ?? (htmlContent ? [htmlContent] : [])

  return (
    <article className={className} dir={dir}>
      {(bannerImage || coverImage) && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <img
            src={bannerImage || coverImage}
            alt={title}
            className="w-full object-cover max-h-96"
          />
        </div>
      )}

      <header className="mb-10">
        {category && (
          <Badge variant="secondary" className="mb-3">
            {category}
          </Badge>
        )}

        <h1
          className={cn(
            designSystem.typography.heading.h1,
            'mb-4 leading-tight',
          )}
        >
          {title || 'Untitled Post'}
        </h1>

        {excerpt && (
          <p
            className={cn(
              designSystem.typography.body.large,
              designSystem.typography.muted,
              'mb-6',
            )}
          >
            {excerpt}
          </p>
        )}

        <div
          className={cn(
            'flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center',
            designSystem.spacing.gap.md,
          )}
        >
          <div className={cn('flex items-center', designSystem.spacing.gap.sm)}>
            <Avatar className="h-10 w-10">
              {authorAvatarUrl && (
                <AvatarImage src={authorAvatarUrl} alt={author} />
              )}
              <AvatarFallback>{getAuthorInitials(author)}</AvatarFallback>
            </Avatar>
            <div>
              <p
                className={cn(
                  designSystem.typography.body.small,
                  'font-medium',
                )}
              >
                {authorSlug ? (
                  <Link
                    to={withLocalePath(`/team/${authorSlug}`, locale ?? 'en')}
                    className="hover:text-primary transition-colors"
                  >
                    {author || 'Unknown Author'}
                  </Link>
                ) : (
                  author || 'Unknown Author'
                )}
              </p>
              <p
                className={cn(
                  designSystem.typography.body.xs,
                  designSystem.typography.muted,
                )}
              >
                {t('blog:author.role')}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'flex flex-wrap items-center',
              designSystem.spacing.gap.md,
            )}
          >
            {publishedAt && (
              <p
                className={cn(
                  designSystem.typography.body.small,
                  designSystem.typography.muted,
                  'flex items-center',
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {formatPublishedDate(publishedAt, locale)}
              </p>
            )}
            {readTime && (
              <p
                className={cn(
                  designSystem.typography.body.small,
                  designSystem.typography.muted,
                  'flex items-center',
                )}
              >
                <Clock3 className="mr-2 h-4 w-4" />
                {readTime}
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="mb-10 space-y-6">
        {content.length > 0 ? (
          <BlogProseContent content={content} dir={dir} />
        ) : (
          <p className={cn(designSystem.typography.body.base, designSystem.typography.muted, 'italic')}>
            {t('blog:editor.emptyPreview')}
          </p>
        )}
      </section>

      {tags.length > 0 && (
        <footer className="mb-12 border-t pt-6">
          <h2 className={cn(designSystem.typography.heading.h5, 'mb-3')}>
            {t('blog:tagsLabel')}
          </h2>
          <div className={cn('flex flex-wrap', designSystem.spacing.gap.sm)}>
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </footer>
      )}
    </article>
  )
}
