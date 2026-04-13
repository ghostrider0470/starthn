import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ssrBlogPost } from '@/server/ssr-data'
import type { BlogPost } from '@/data/blog-posts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RelatedPosts } from '@/components/blog/RelatedPosts'
import { BlogPostPreview } from '@/components/blog/BlogPostPreview'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { LoadingState } from '@/components/layout/LoadingState'
import { Button } from '@/components/ui/button'
import { getBlogPostBySlug } from '@/data/blog-posts'
import { useBlogPost } from '@/hooks/useBlogQueries'
import { usePublicTags } from '@/hooks/useTagQueries'
import { usePublicCategories } from '@/hooks/useCategoryQueries'
import {
  localizeBlogCategory,
  localizeBlogReadTime,
  localizeBlogTag,
} from '@/lib/blog-i18n'
import { designSystem } from '@/lib/design-system'
import {
  getLocaleDir,
  getLocaleFromPath,
  withLocalePath,
} from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { img } from '@/lib/image'

export const Route = createFileRoute('/{-$locale}/blog/$slug')({
  loader: async ({ params }) => {
    try {
      return await ssrBlogPost(params.slug, params.locale || undefined)
    } catch {
      return null
    }
  },
  head: ({ loaderData }) => {
    const post = loaderData as any
    const title = `${post?.title ?? 'Blog'} — StartHN`
    const description = post?.excerpt ?? 'Read our latest blog post.'
    const rawImage = post?.bannerImage ?? post?.coverImage
    const ogImage = rawImage
      ? img(rawImage, { width: 1200, format: 'auto' })
      : '/clean-square.png'

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: ogImage },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: ogImage },
      ],
    }
  },
  component: BlogPostPage,
})

function upsertMetaTag(
  attribute: 'name' | 'property',
  key: string,
  content: string,
) {
  let node = document.head.querySelector(
    `meta[${attribute}="${key}"]`,
  )

  if (!node) {
    node = document.createElement('meta')
    node.setAttribute(attribute, key)
    document.head.appendChild(node)
  }

  node.setAttribute('content', content)
}

function updateArticleTagMeta(tags: Array<string>) {
  document.head
    .querySelectorAll('meta[data-blog-article-tag="true"]')
    .forEach((node) => node.remove())

  tags.forEach((tag) => {
    const tagNode = document.createElement('meta')
    tagNode.setAttribute('property', 'article:tag')
    tagNode.setAttribute('content', tag)
    tagNode.setAttribute('data-blog-article-tag', 'true')
    document.head.appendChild(tagNode)
  })
}

function upsertLinkTag(rel: string, hreflang: string, href: string) {
  let node = document.head.querySelector(
    `link[rel="${rel}"][hreflang="${hreflang}"]`,
  ) as HTMLLinkElement | null

  if (!node) {
    node = document.createElement('link')
    node.setAttribute('rel', rel)
    node.setAttribute('hreflang', hreflang)
    document.head.appendChild(node)
  }

  node.setAttribute('href', href)
}

function useBlogPostSeo(post: BlogPost | undefined, locale: string) {
  const { t } = useTranslation('pages')

  useEffect(() => {
    if (!post) {
      return
    }

    // TODO: add "meta.siteName" key to the pages namespace JSON on CDN ("Horizon Tech Blog")
    const siteName = t('meta.siteName', 'Horizon Tech Blog')
    document.title = `${post.title} | ${siteName} — ${locale}`

    upsertMetaTag('name', 'description', post.excerpt)
    upsertMetaTag('property', 'og:title', post.title)
    upsertMetaTag('property', 'og:description', post.excerpt)
    upsertMetaTag('property', 'og:type', 'article')
    upsertMetaTag('property', 'og:locale', locale)
    upsertMetaTag('property', 'og:site_name', siteName)
    upsertMetaTag('property', 'article:published_time', post.publishedAt)
    const ogImage = post.bannerImage || post.coverImage
    if (ogImage) {
      upsertMetaTag('property', 'og:image', ogImage)
    }
    updateArticleTagMeta(post.tags)

    // Self-referencing canonical hreflang for the current locale
    // TODO: fetch available translation locales from API to add full hreflang alternate set
    upsertLinkTag('alternate', locale, window.location.href)

    return () => {
      document.head
        .querySelectorAll('meta[data-blog-article-tag="true"]')
        .forEach((node) => node.remove())
    }
  }, [post, locale, t])
}

function BlogPostPage() {
  const { t } = useTranslation(['pages', 'blog'])
  const { slug } = Route.useParams()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  // Use SSR loader data as initial query cache — no double-fetch
  const loaderPost = Route.useLoaderData() as BlogPost | null
  const { data: apiPost, isPending } = useBlogPost(slug, currentLocale, loaderPost)
  const post = apiPost ?? getBlogPostBySlug(slug)
  const { data: tags = [] } = usePublicTags()
  const { data: categories = [] } = usePublicCategories()

  useBlogPostSeo(post, currentLocale)

  if (isPending && !post) {
    return (
      <PageContainer>
        <SectionContainer spacing="lg" className="mx-auto max-w-5xl">
          <LoadingState message={t('error.loading.blog', 'Loading post...')} />
        </SectionContainer>
      </PageContainer>
    )
  }

  if (!post) {
    return (
      <PageContainer>
        <SectionContainer
          spacing="lg"
          className="mx-auto max-w-5xl text-center"
        >
          <h1 className={cn(designSystem.typography.heading.h2, 'mb-3')}>
            {t('blogPost.notFound.title')}
          </h1>
          <p
            className={cn(
              designSystem.typography.body.base,
              designSystem.typography.muted,
              'mb-6',
            )}
          >
            {t('blogPost.notFound.description', { slug })}
          </p>
          <Button asChild>
            <Link to={withLocalePath('/blog', currentLocale)}>
              {t('blogPost.notFound.back')}
            </Link>
          </Button>
        </SectionContainer>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionContainer spacing="lg" className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" className="mb-6 px-0">
          <Link to={withLocalePath('/blog', currentLocale)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('blogPost.back')}
          </Link>
        </Button>

        <BlogPostPreview
          title={post.title}
          excerpt={post.excerpt}
          author={post.author}
          category={localizeBlogCategory(categories, post.category, currentLocale)}
          publishedAt={post.publishedAt}
          readTime={localizeBlogReadTime(t, post.readTime)}
          content={post.content}
          tags={post.tags.map((tag) => localizeBlogTag(tags, tag, currentLocale))}
          authorSlug={post.authorSlug}
          authorAvatarUrl={post.authorAvatarUrl}
          locale={currentLocale}
          dir={getLocaleDir(currentLocale)}
          coverImage={post.coverImage}
          bannerImage={post.bannerImage}
        />

        {post.authorSlug && (
          <div className="my-10 flex items-center gap-4 rounded-lg border p-6">
            <Avatar className="h-14 w-14">
              {post.authorAvatarUrl && (
                <AvatarImage src={img(post.authorAvatarUrl, { width: 96, format: 'auto' })} alt={post.author} width={56} height={56} />
              )}
              <AvatarFallback>
                {post.author
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p
                className={cn(
                  designSystem.typography.body.xs,
                  designSystem.typography.muted,
                  'mb-1 uppercase tracking-wider',
                )}
              >
                {t('blog:aboutAuthor', 'About the author')}
              </p>
              <p className={cn(designSystem.typography.body.base, 'font-semibold')}>
                {post.author}
              </p>
              <Link
                to={withLocalePath(`/team/${post.authorSlug}`, currentLocale)}
                className={cn(
                  designSystem.typography.body.small,
                  'text-primary hover:underline',
                )}
              >
                {t('blog:viewProfile', 'View profile')}
              </Link>
            </div>
          </div>
        )}

        <RelatedPosts currentPost={post} locale={currentLocale} />
      </SectionContainer>
    </PageContainer>
  )
}
