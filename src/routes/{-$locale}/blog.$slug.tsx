import {
  Link,
  createFileRoute,
  notFound,
  useLocation,
} from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { QueryClient } from '@tanstack/react-query'
import type { BlogPost } from '@/data/blog-posts'
import {
  ssrBlogPost,
  ssrBlogPostExists,
  ssrCategories,
  ssrRelatedPosts,
  ssrTags,
} from '@/server/ssr-data'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RelatedPosts } from '@/components/blog/RelatedPosts'
import { BlogPostPreview } from '@/components/blog/BlogPostPreview'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { LoadingState } from '@/components/layout/LoadingState'
import { Button } from '@/components/ui/button'
import { blogKeys, useBlogPost } from '@/hooks/useBlogQueries'
import { usePublicTags } from '@/hooks/useTagQueries'
import { usePublicCategories } from '@/hooks/useCategoryQueries'
import blogService from '@/services/blog.service'
import {
  blogAuthorInitials,
  blogAuthorName,
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
import {
  SEO_ORIGIN,
  buildBlogPostingStructuredData,
  buildBreadcrumbTrail,
  buildLocalizedSeoHead,
  jsonLd,
  truncateAtWord,
} from '@/lib/seo'
import {
  localizedPageHead,
  resolveSeoStrings,
  toPageLocale,
  translateExact,
} from '@/lib/seo-meta'

/** The post fields head() reads (D1 DTO or API response). */
type PostSeoFields = {
  slug: string
  title: string
  excerpt?: string | null
  coverImage?: string | null
  bannerImage?: string | null
  publishedAt?: string | null
  author?: string | null
  authorName?: string | null
}

type LoadedPost = NonNullable<Awaited<ReturnType<typeof ssrBlogPost>>> | BlogPost

type BlogPostLoaderData = {
  post: LoadedPost | null
  categories: Awaited<ReturnType<typeof ssrCategories>>
  tags: Awaited<ReturnType<typeof ssrTags>>
  related: Awaited<ReturnType<typeof ssrRelatedPosts>>
}

const EMPTY_LOADER_DATA: BlogPostLoaderData = {
  post: null,
  categories: null,
  tags: null,
  related: null,
}

/**
 * Client-side navigation: the D1 fetchers resolve to null in the browser, so
 * read the post through the API. It shares useBlogPost's React Query cache,
 * and it lets head() show the post title after client navigation too.
 */
async function fetchPostThroughApi(
  queryClient: QueryClient,
  slug: string,
  locale: string,
): Promise<BlogPost | null> {
  if (typeof window === 'undefined') return null
  try {
    return await queryClient.ensureQueryData({
      queryKey: blogKeys.post(slug, locale),
      queryFn: () => blogService.fetchBlogPostBySlug(slug, locale),
      staleTime: 5 * 60 * 1000,
    })
  } catch {
    return null
  }
}

/** Absolute URL of the post's hero image at share size, or null. */
function absolutePostImage(post: PostSeoFields): string | null {
  const raw = post.bannerImage || post.coverImage
  if (!raw) return null
  // og:image / twitter:image MUST be absolute — link-preview crawlers
  // (Teams, WhatsApp, Facebook…) can't resolve relative /img/ proxy URLs.
  const optimized = img(raw, { width: 1200, format: 'auto' })
  if (!optimized) return null
  if (/^https?:\/\//.test(optimized)) return optimized
  return `${SEO_ORIGIN}${optimized.startsWith('/') ? '' : '/'}${optimized}`
}

export const Route = createFileRoute('/{-$locale}/blog/$slug')({
  loader: async ({ params, context }): Promise<BlogPostLoaderData> => {
    const locale = toPageLocale(params.locale)
    let post: LoadedPost | null = null
    let categories: BlogPostLoaderData['categories'] = null
    let tags: BlogPostLoaderData['tags'] = null
    try {
      ;[post, categories, tags] = await Promise.all([
        ssrBlogPost(params.slug, locale),
        ssrCategories(locale),
        ssrTags(locale),
      ])
    } catch {
      return EMPTY_LOADER_DATA
    }

    if (!post) {
      let exists: boolean | null = null
      try {
        exists = await ssrBlogPostExists(params.slug)
      } catch {
        exists = null
      }
      // With D1 (SSR), a missing post is a real 404 in this locale: either
      // the slug exists in no language, or the post has no version in this
      // one (no translation row and it is not the post's own language).
      // Never an English "Loading post…" shell with a 200.
      if (exists !== null) throw notFound()
      post = await fetchPostThroughApi(context.queryClient, params.slug, locale)
    }

    let related: BlogPostLoaderData['related'] = null
    if (post) {
      try {
        related = await ssrRelatedPosts(locale, post.category, post.slug)
      } catch {
        related = null
      }
    }

    return { post, categories, tags, related }
  },
  head: ({ loaderData, params, matches }) => {
    // A 404 is rendered by the root route, whose head() carries the 404
    // title; on the server only that head() runs, so emit nothing here
    // either (keeps the hydration re-run identical).
    if (matches[0]?.globalNotFound) return {}

    const locale = toPageLocale(params.locale)
    const post = loaderData?.post as PostSeoFields | null | undefined
    if (!post) return localizedPageHead('blog', locale)

    const title =
      post.title.length <= 48 ? `${post.title} | Start HN` : post.title
    const description =
      truncateAtWord(post.excerpt ?? '', 155) ||
      resolveSeoStrings('blog', locale).description
    const image = absolutePostImage(post)
    const path = `/blog/${params.slug}`
    const { canonicalUrl } = buildLocalizedSeoHead(path, locale)
    // Until D1 import timestamps are cleaned, publishedAt stands in for the
    // modified time too.
    const publishedAt = post.publishedAt || null

    const breadcrumbs = buildBreadcrumbTrail(
      '/blog',
      locale,
      (key) => translateExact(locale, 'common', key),
      { name: post.title, path },
    )

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        ...(image
          ? [
              { property: 'og:image', content: image },
              { property: 'og:image:alt', content: post.title },
              { name: 'twitter:image', content: image },
            ]
          : []),
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        ...(publishedAt
          ? [
              { property: 'article:published_time', content: publishedAt },
              { property: 'article:modified_time', content: publishedAt },
            ]
          : []),
      ],
      scripts: [
        jsonLd(
          buildBlogPostingStructuredData({
            canonicalUrl,
            headline: post.title,
            description,
            image: image ?? `${SEO_ORIGIN}/og-image.png`,
            datePublished: publishedAt,
            dateModified: publishedAt,
            authorName: post.authorName || post.author || null,
            locale,
          }),
        ),
        ...(breadcrumbs ? [jsonLd(breadcrumbs)] : []),
      ],
    }
  },
  component: BlogPostPage,
})

function BlogPostPage() {
  const { t } = useTranslation(['pages', 'blog'])
  const { slug } = Route.useParams()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  // Use SSR loader data as initial query cache — no double-fetch
  const loaderData = Route.useLoaderData()
  const loaderPost = loaderData.post as BlogPost | null
  const { data: post, isPending } = useBlogPost(slug, currentLocale, loaderPost)
  const { data: tags = [] } = usePublicTags(loaderData.tags ?? undefined)
  const { data: categories = [] } = usePublicCategories(
    loaderData.categories ?? undefined,
  )

  // With loader data (SSR, or the API read on client navigation) the query
  // starts with data, so this only shows while a client-side fetch runs.
  if (isPending) {
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
          author={blogAuthorName(post.author)}
          category={localizeBlogCategory(categories, post.category, currentLocale)}
          subcategory={
            post.subcategory
              ? localizeBlogCategory(categories, post.subcategory, currentLocale)
              : undefined
          }
          publishedAt={post.publishedAt}
          readTime={localizeBlogReadTime(t, post.readTime)}
          content={post.content}
          tags={post.tags.map((tag) => localizeBlogTag(tags, tag, currentLocale))}
          // No authorSlug: the /team pages are disabled (404), so the author
          // name must not link there.
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
                <AvatarImage src={img(post.authorAvatarUrl, { width: 96, format: 'auto' })} alt={blogAuthorName(post.author)} width={56} height={56} />
              )}
              <AvatarFallback>
                {blogAuthorInitials(post.author)}
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
                {blogAuthorName(post.author)}
              </p>
            </div>
          </div>
        )}

        <RelatedPosts
          currentPost={post}
          locale={currentLocale}
          initialRelated={
            (loaderData.related ?? undefined) as Array<BlogPost> | undefined
          }
        />
      </SectionContainer>
    </PageContainer>
  )
}
