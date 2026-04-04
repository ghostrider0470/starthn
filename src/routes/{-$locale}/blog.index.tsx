import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, FileText, Filter, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import type { SupportedLocale } from '@/lib/i18n-utils'
import { BlogCategoryFilter } from '@/components/blog/BlogCategoryFilter'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { BlogPostCardSkeleton } from '@/components/blog/BlogPostCardSkeleton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { LoadingState } from '@/components/layout/LoadingState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StandardCard } from '@/components/ui/standard-card'
import { useBlogPostsPaged } from '@/hooks/useBlogQueries'
import { usePublicCategories } from '@/hooks/useCategoryQueries'
import { usePublicTags } from '@/hooks/useTagQueries'
import { localizeBlogCategory, localizeBlogTag, localizeBlogReadTime } from '@/lib/blog-i18n'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [9, 18, 36] as const
const DEFAULT_PAGE_SIZE = 9

// ── URL search params schema ─────────────────────────────────────────────────

const blogSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  subcategory: z.string().optional().catch(undefined),
  tag: z.string().optional().catch(undefined),
  page: z.coerce.number().min(1).optional().catch(undefined),
  pageSize: z.coerce.number().optional().catch(undefined),
})

type BlogSearch = z.infer<typeof blogSearchSchema>

export const Route = createFileRoute('/{-$locale}/blog/')({
  component: BlogIndexPage,
  pendingComponent: BlogPendingPage,
  validateSearch: blogSearchSchema,
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPublishedDate(date: string, locale: string): string {
  return new Date(date).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Page ─────────────────────────────────────────────────────────────────────

function BlogIndexPage() {
  const { t } = useTranslation(['pages', 'blog'])
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const search: BlogSearch = Route.useSearch()

  // Local state initialized from URL, synced back to URL
  const [selectedCategory, setSelectedCategory] = useState(search.category ?? 'All')
  const [selectedSubcategory, setSelectedSubcategory] = useState(search.subcategory ?? '')
  const [selectedTag, setSelectedTag] = useState(search.tag ?? '')
  const [searchQuery, setSearchQuery] = useState(search.q ?? '')
  const [showAdvanced, setShowAdvanced] = useState(!!search.tag)
  const [tagSearch, setTagSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(search.page ?? 1)
  const [pageSize, setPageSize] = useState(
    PAGE_SIZE_OPTIONS.includes(search.pageSize as typeof PAGE_SIZE_OPTIONS[number])
      ? (search.pageSize as number)
      : DEFAULT_PAGE_SIZE,
  )

  // Sync filter state → URL search params (without triggering re-renders from router)
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory)
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory)
    if (selectedTag) params.set('tag', selectedTag)
    if (currentPage > 1) params.set('page', String(currentPage))
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(pageSize))

    const qs = params.toString()
    const url = location.pathname + (qs ? `?${qs}` : '')
    window.history.replaceState(null, '', url)
  }, [selectedCategory, selectedSubcategory, selectedTag, searchQuery, currentPage, pageSize, location.pathname])

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, selectedSubcategory, selectedTag, searchQuery])

  const clearAllFilters = useCallback(() => {
    setSelectedCategory('All')
    setSelectedSubcategory('')
    setSelectedTag('')
    setSearchQuery('')
    setShowAdvanced(false)
    setTagSearch('')
    setCurrentPage(1)
  }, [])

  // ── Debounced search for API calls ──────────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // ── Data fetching (server-side pagination + filtering) ─────────────────

  const queryParams = useMemo(() => ({
    page: currentPage,
    pageSize,
    ...(selectedCategory !== 'All' && { category: selectedCategory }),
    ...(selectedSubcategory && { subcategory: selectedSubcategory }),
    ...(selectedTag && { tag: selectedTag }),
    ...(debouncedSearch.trim() && { q: debouncedSearch.trim() }),
  }), [currentPage, pageSize, selectedCategory, selectedSubcategory, selectedTag, debouncedSearch])

  const { data: pagedData, isPending, isFetching } = useBlogPostsPaged(currentLocale, queryParams)
  const { data: categories = [] } = usePublicCategories()
  const { data: tags = [] } = usePublicTags()

  const posts = pagedData?.items ?? []
  const totalCount = pagedData?.totalCount ?? 0
  const totalPages = pagedData?.totalPages ?? 1
  const safePage = Math.min(currentPage, totalPages || 1)

  // ── Category / tag lookups (for filter UI — uses all categories/tags, not just current page) ──

  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return tags
    const q = tagSearch.toLowerCase().trim()
    return tags.filter(
      (t) => t.label.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    )
  }, [tags, tagSearch])

  const hasActiveFilters =
    selectedCategory !== 'All' || !!selectedSubcategory || !!selectedTag || !!searchQuery.trim()

  // Featured post is the first one returned by the API (sorted by isFeatured desc, then date desc)
  const featuredPost = posts[0] ?? null
  const remainingPosts = posts.slice(1)

  // ── Pagination helpers ────────────────────────────────────────────────────

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
    // Scroll immediately — keepPreviousData means grid is always in DOM
    setTimeout(() => {
      document.getElementById('blog-grid')?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }, [])

  const pageItems = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
      .reduce<Array<number | 'ellipsis'>>((acc, p, idx, arr) => {
        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('ellipsis')
        acc.push(p)
        return acc
      }, [])
  }, [totalPages, safePage])

  const PaginationNav = useCallback(() => (
    <nav
      aria-label={t('blog.index.pagination.label', 'Blog pagination')}
      className="flex items-center gap-1.5"
    >
      <button
        onClick={() => goToPage(safePage - 1)}
        disabled={safePage <= 1}
        aria-label={t('blog.index.pagination.previous', 'Previous page')}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors',
          safePage <= 1
            ? 'pointer-events-none border-border/40 text-muted-foreground/40'
            : 'border-border hover:border-primary/30 hover:bg-primary/5 text-foreground',
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageItems.map((item, idx) =>
        item === 'ellipsis' ? (
          <span
            key={`e-${idx}`}
            className="inline-flex h-9 w-5 items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => goToPage(item)}
            aria-current={item === safePage ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-colors',
              item === safePage
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:border-primary/30 hover:bg-primary/5 text-foreground',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => goToPage(safePage + 1)}
        disabled={safePage >= totalPages}
        aria-label={t('blog.index.pagination.next', 'Next page')}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors',
          safePage >= totalPages
            ? 'pointer-events-none border-border/40 text-muted-foreground/40'
            : 'border-border hover:border-primary/30 hover:bg-primary/5 text-foreground',
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  ), [goToPage, pageItems, safePage, totalPages, t])

  // ── Loading / empty states ──────────────────────────────────────────────

  // Show loading when data hasn't arrived yet
  if (isPending) {
    return <BlogPendingPage />
  }

  if (totalCount === 0 && !isPending && !hasActiveFilters) {
    return (
      <>
        <PageHeader
          variant="hero"
          align="center"
          title={t('blog.index.hero.title')}
          description={t('blog.index.hero.description')}
        />
        <PageContainer maxWidth="2xl">
          <SectionContainer spacing="lg" className="pt-0">
            <p
              className={cn(
                designSystem.typography.body.base,
                designSystem.typography.muted,
                'text-center',
              )}
            >
              {t('blog.index.noPosts', 'No blog posts yet.')}
            </p>
          </SectionContainer>
        </PageContainer>
      </>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        variant="hero"
        align="center"
        title={t('blog.index.hero.title')}
        description={t('blog.index.hero.description')}
        tags={categories
          .filter((c) => !c.parentId)
          .slice(0, 4)
          .map((c) => ({
            label: localizeBlogCategory(categories, c.label, currentLocale),
          }))}
      />

      <PageContainer maxWidth="2xl">
        <SectionContainer spacing="lg" className="pt-0">
          <div className="mb-4 sm:mb-8 space-y-3 sm:space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'blog.index.filters.searchPlaceholder',
                  'Search articles by title, topic, or content...',
                )}
                className={cn(
                  'w-full rounded-xl border bg-background/80 backdrop-blur-sm pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3.5 text-sm',
                  'shadow-sm transition-shadow focus:shadow-md',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30',
                  'placeholder:text-muted-foreground/50',
                )}
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/60">
                  /
                </kbd>
              )}
            </div>

            {/* Category pills + advanced toggle */}
            <div className="flex items-start justify-between gap-4">
              <BlogCategoryFilter
                categories={categories}
                locale={currentLocale}
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat)
                  setSelectedSubcategory('')
                  setSelectedTag('')
                }}
                selectedSubcategory={selectedSubcategory}
                onSelectSubcategory={(sub) => setSelectedSubcategory(sub)}
              />
              {tags.length > 0 && (
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    showAdvanced
                      ? 'border-primary/30 bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {t('blog.index.filters.advanced', 'Filters')}
                  {(selectedTag || showAdvanced) && (
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 transition-transform',
                        showAdvanced && 'rotate-180',
                      )}
                    />
                  )}
                  {selectedTag && !showAdvanced && (
                    <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      1
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Advanced filters panel */}
            {showAdvanced && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {tags.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('blog.index.filters.filterByTag', 'Filter by tag')}
                      </span>
                      {selectedTag && (
                        <button
                          onClick={() => setSelectedTag('')}
                          className="text-xs text-primary hover:underline"
                        >
                          {t('blog.index.filters.clearTag', 'Clear')}
                        </button>
                      )}
                    </div>
                    {tags.length > 12 && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <input
                          type="text"
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          placeholder={t(
                            'blog.index.filters.searchTags',
                            'Search tags...',
                          )}
                          className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </div>
                    )}
                    <div
                      className={cn(
                        'flex flex-wrap max-h-32 overflow-y-auto',
                        designSystem.spacing.gap.sm,
                      )}
                    >
                      {filteredTags.map((tag) => {
                        const isSelected = tag.slug === selectedTag
                        return (
                          <Badge
                            asChild
                            key={tag.id}
                            variant={isSelected ? 'default' : 'outline'}
                            className={cn(
                              'min-h-8 px-3 py-1 text-xs transition-all',
                              !isSelected && 'bg-background hover:bg-muted',
                            )}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTag(isSelected ? '' : tag.slug)
                              }
                              aria-pressed={isSelected}
                              className="cursor-pointer"
                            >
                              {localizeBlogTag(tags, tag.label, currentLocale)}
                              {isSelected && <X className="ml-1.5 h-3 w-3" />}
                            </button>
                          </Badge>
                        )
                      })}
                      {filteredTags.length === 0 && (
                        <p className="text-xs text-muted-foreground py-1">
                          {t(
                            'blog.index.filters.noTagsMatch',
                            'No tags match your search.',
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active filter summary */}
            <div className="flex items-center justify-between gap-4">
              <p
                className={cn(
                  designSystem.typography.body.small,
                  designSystem.typography.muted,
                )}
              >
                {t('blog.index.filters.postsInView', {
                  count: totalCount,
                })}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-primary hover:underline"
                >
                  {t('blog.index.clearFilters', 'Clear all filters')}
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {!featuredPost && hasActiveFilters ? (
            <div className="text-center py-16">
              <Search className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
              <p
                className={cn(
                  designSystem.typography.body.base,
                  designSystem.typography.muted,
                  'mb-4',
                )}
              >
                {t(
                  'blog.index.noResults',
                  'No posts match your current filters.',
                )}
              </p>
              <Button variant="outline" onClick={clearAllFilters}>
                {t('blog.index.clearFilters', 'Clear all filters')}
              </Button>
            </div>
          ) : featuredPost ? (
            <>
              <StandardCard
                variant="hover"
                padding="none"
                className="mb-8 overflow-hidden"
              >
                <div className={cn(designSystem.grid.responsive.two)}>
                  <div
                    className={cn(
                      'min-h-56 border-b md:min-h-full md:border-b-0 md:border-r overflow-hidden relative',
                      !featuredPost.coverImage &&
                        'bg-gradient-to-br from-primary/10 via-muted/30 to-accent/10',
                    )}
                  >
                    {featuredPost.coverImage ? (
                      <img
                        src={featuredPost.coverImage}
                        alt={featuredPost.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 opacity-30">
                          <FileText
                            className="h-16 w-16 text-primary/60"
                            strokeWidth={1.5}
                          />
                          <span className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wider">
                            {localizeBlogCategory(
                              categories,
                              featuredPost.category,
                              currentLocale,
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      designSystem.spacing.component.card,
                      'flex flex-col justify-center',
                    )}
                  >
                    <div
                      className={cn(
                        'mb-3 flex flex-wrap items-center',
                        designSystem.spacing.gap.sm,
                      )}
                    >
                      <Badge>{t('blog.index.featured.badge')}</Badge>
                      <Badge variant="outline">
                        {localizeBlogCategory(
                          categories,
                          featuredPost.category,
                          currentLocale,
                        )}
                      </Badge>
                    </div>

                    <h2
                      className={cn(
                        designSystem.typography.heading.h2,
                        'mb-3 leading-tight',
                      )}
                    >
                      {featuredPost.title}
                    </h2>

                    <p
                      className={cn(
                        designSystem.typography.body.base,
                        designSystem.typography.muted,
                        'mb-4',
                      )}
                    >
                      {featuredPost.excerpt}
                    </p>

                    <p
                      className={cn(
                        designSystem.typography.body.small,
                        designSystem.typography.muted,
                        'mb-5',
                      )}
                    >
                      {featuredPost.author} ·{' '}
                      {formatPublishedDate(
                        featuredPost.publishedAt,
                        currentLocale,
                      )}{' '}
                      · {localizeBlogReadTime(t, featuredPost.readTime)}
                    </p>

                    <Button asChild className="w-fit">
                      <Link
                        to={withLocalePath(
                          `/blog/${featuredPost.slug}`,
                          currentLocale,
                        )}
                      >
                        {t('blog.index.featured.readCta')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </StandardCard>

              {remainingPosts.length > 0 && (
                <>
                  {/* Pagination toolbar above grid */}
                  <div
                    className="mt-10 mb-6 flex flex-wrap items-center justify-between gap-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      {t('blog.index.pagination.showing', {
                        defaultValue: 'Showing {{from}}–{{to}} of {{total}}',
                        from: (safePage - 1) * pageSize + 1,
                        to: Math.min(safePage * pageSize, Math.max(0, totalCount - 1)),
                        total: Math.max(0, totalCount - 1),
                      })}
                    </p>
                    <div className="flex items-center gap-3">
                      {totalPages > 1 && <PaginationNav />}
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="page-size-top" className="text-xs text-muted-foreground shrink-0">
                          {t('blog.index.pagination.show', 'Show')}
                        </label>
                        <select
                          id="page-size-top"
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value))
                            setCurrentPage(1)
                          }}
                          className={cn(
                            'h-8 rounded-md border bg-background px-2 text-xs',
                            'focus:outline-none focus:ring-2 focus:ring-primary/20',
                          )}
                        >
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div id="blog-grid" style={{ scrollMarginTop: '5rem' }} />
                  <div
                    className={cn(
                      designSystem.grid.responsive.three,
                      designSystem.spacing.gap.lg,
                    )}
                  >
                    {remainingPosts.map((post) => (
                      <div key={post.slug}>
                        <BlogPostCard post={post} locale={currentLocale} />
                      </div>
                    ))}
                  </div>

                  {/* Pagination below grid */}
                  {totalPages > 1 && (
                    <div className="mt-10 flex justify-center">
                      <PaginationNav />
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}
        </SectionContainer>
      </PageContainer>
    </>
  )
}

function BlogPendingPage() {
  const { t } = useTranslation(['pages', 'blog'])

  return (
    <>
      <PageHeader
        variant="hero"
        align="center"
        title={t('blog.index.hero.title')}
        description={t('blog.index.hero.description')}
      />

      <PageContainer maxWidth="2xl">
        <SectionContainer spacing="lg" className="pt-0">
          <LoadingState
            message={t('error.loading.blog', 'Loading articles...')}
          />
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.lg,
            )}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <BlogPostCardSkeleton key={`blog-pending-${index}`} />
            ))}
          </div>
        </SectionContainer>
      </PageContainer>
    </>
  )
}
