import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { ChevronLeft, Github, Globe, Linkedin, Twitter } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { BlogProseContent } from '@/components/blog/BlogProseContent'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { LoadingState } from '@/components/layout/LoadingState'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthorBySlug } from '@/hooks/useAuthorQueries'
import { useBlogPosts } from '@/hooks/useBlogQueries'
import type { SocialLinks } from '@/services/author.service'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/team/$slug')({
  component: AuthorDetailPage,
})

function SocialLinkButton({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </a>
  )
}

function SocialLinksRow({ links }: { links: SocialLinks }) {
  return (
    <div className="flex items-center gap-1">
      {links.linkedIn && (
        <SocialLinkButton href={links.linkedIn} label="LinkedIn" icon={Linkedin} />
      )}
      {links.twitter && (
        <SocialLinkButton href={links.twitter} label="Twitter" icon={Twitter} />
      )}
      {links.gitHub && (
        <SocialLinkButton href={links.gitHub} label="GitHub" icon={Github} />
      )}
      {links.website && (
        <SocialLinkButton href={links.website} label="Website" icon={Globe} />
      )}
    </div>
  )
}

function AuthorDetailPage() {
  const { t } = useTranslation(['pages', 'blog'])
  const { slug } = Route.useParams()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  const lang = currentLocale !== 'en-US' ? currentLocale : undefined
  const { data: author, isPending: authorPending } = useAuthorBySlug(slug, lang)
  const { data: allPosts } = useBlogPosts(currentLocale)

  const authorPosts = useMemo(() => {
    if (!allPosts || !slug) return []
    return allPosts.filter((post) => post.authorSlug === slug)
  }, [allPosts, slug])

  if (authorPending) {
    return (
      <PageContainer>
        <SectionContainer spacing="lg" className="mx-auto max-w-5xl">
          <LoadingState message={t('authors.loading', 'Loading author...')} />
        </SectionContainer>
      </PageContainer>
    )
  }

  if (!author) {
    return (
      <PageContainer>
        <SectionContainer spacing="lg" className="mx-auto max-w-5xl text-center">
          <h1 className={cn(designSystem.typography.heading.h2, 'mb-3')}>
            {t('authors.notFound.title', 'Author not found')}
          </h1>
          <p
            className={cn(
              designSystem.typography.body.base,
              designSystem.typography.muted,
              'mb-6',
            )}
          >
            {t('authors.notFound.description', 'The author you are looking for does not exist.')}
          </p>
          <Button asChild>
            <Link to={withLocalePath('/team', currentLocale)}>
              {t('authors.notFound.back', 'Back to authors')}
            </Link>
          </Button>
        </SectionContainer>
      </PageContainer>
    )
  }

  const initials = `${author.firstName.charAt(0)}${author.lastName.charAt(0)}`.toUpperCase()
  const fullName = `${author.firstName} ${author.lastName}`

  return (
    <PageContainer>
      <SectionContainer spacing="lg" className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" className="mb-6 px-0">
          <Link to={withLocalePath('/team', currentLocale)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('authors.back', 'All authors')}
          </Link>
        </Button>

        {/* Hero section */}
        <div className="mb-12 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-8">
          <Avatar className="mb-4 h-28 w-28 shrink-0 sm:mb-0">
            {author.avatarUrl && (
              <AvatarImage src={author.avatarUrl} alt={fullName} />
            )}
            <AvatarFallback className="bg-primary/10 text-2xl text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className={cn(designSystem.typography.heading.h1, 'mb-2')}>
              {fullName}
            </h1>

            {author.profession && (
              <p
                className={cn(
                  designSystem.typography.body.large,
                  'mb-4 font-medium text-primary',
                )}
              >
                {author.profession}
              </p>
            )}

            {author.bio && (
              <p
                className={cn(
                  designSystem.typography.body.base,
                  designSystem.typography.muted,
                  'mb-4 max-w-2xl',
                )}
              >
                {author.bio}
              </p>
            )}

            <SocialLinksRow links={author.socialLinks} />

            {author.expertise.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 sm:justify-start justify-center">
                {author.expertise.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        {author.pageContent && (
          <div className="mb-12">
            <BlogProseContent content={[author.pageContent]} slug={slug} />
          </div>
        )}

        {/* Author's posts */}
        {authorPosts.length > 0 && (
          <div>
            <h2 className={cn(designSystem.typography.heading.h2, 'mb-6')}>
              {t('authors.articlesByAuthor', {
                name: author.firstName,
                defaultValue: `Articles by ${author.firstName}`,
              })}
            </h2>

            <StaggerContainer
              className={cn(
                designSystem.grid.responsive.three,
                designSystem.spacing.gap.lg,
              )}
            >
              {authorPosts.map((post) => (
                <StaggerItem key={post.slug}>
                  <BlogPostCard post={post} locale={currentLocale} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        )}
      </SectionContainer>
    </PageContainer>
  )
}
