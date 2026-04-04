import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { TRANSLATOR_CODE_MAP } from '@/lib/languages'
import { localizeBlogCategory } from '@/lib/blog-i18n'
import {
  useAdminBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useBlogTranslations,
  useTranslateBlogPost,
  useDeleteBlogTranslation,
  useUpdateBlogTranslation,
} from '@/hooks/useBlogQueries'
import { usePublicCategories } from '@/hooks/useCategoryQueries'
import blogService from '@/services/blog.service'
import type { CreateBlogPostDto, UpdateBlogPostDto } from '@/services/blog.service'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  Save,
  Star,
  Loader2,
  Eye,
  EyeOff,
  CalendarDays,
  Clock3,
  Sparkles,
  Link as LinkIcon,
  Languages,
  Trash2,
  Check,
  ChevronDown,
  PenLine,
  Columns2,
  Pencil,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { BlogPostPreview } from '@/components/blog/BlogPostPreview'
import { ImageCropUpload } from '@/components/blog/ImageCropUpload'
import { TagCombobox } from '@/components/blog/TagCombobox'
import { useAuth } from '@/contexts/AuthContext'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { designSystem } from '@/lib/design-system'
import { LANGUAGES, LANGUAGE_MAP, countryCodeToEmoji } from '@/lib/languages'
import { SEO_PRIORITY_LOCALES } from '@/lib/seo'
import { cn } from '@/lib/utils'

const SEO_NON_EN: string[] = SEO_PRIORITY_LOCALES.filter((l) => l !== 'en-US')

type EditorMode = 'edit' | 'split' | 'preview'

export const Route = createFileRoute('/{-$locale}/admin/blog_/editor')({
  component: BlogEditorPage,
})

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function contentToHtml(content: string[]): string {
  if (!content || content.length === 0) return ''
  if (content.length === 1 && content[0].startsWith('<')) return content[0]
  return content.map((p) => `<p>${p}</p>`).join('')
}

function htmlToContent(html: string): string[] {
  if (!html || html === '<p></p>') return []
  return [html]
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

// Invisible input base classes — looks like rendered text, shows ring on focus
const invisibleInput =
  'border-none shadow-none bg-transparent focus-visible:ring-1 focus-visible:ring-primary/30 rounded-md px-0 outline-none w-full'

function BlogEditorPage() {
  const { t } = useTranslation(['pages', 'blog'])
  const blogT = (key: string, options?: Record<string, unknown>) => t(key, { ...options, ns: 'blog' })
  const currentLocale = getLocaleFromPath(window.location.pathname)
  const navigate = useNavigate()
  const { user } = useAuth()
  const searchParams = new URLSearchParams(window.location.search)
  const editSlug = searchParams.get('slug')

  const { data: posts } = useAdminBlogPosts()
  const { data: allCategories = [] } = usePublicCategories()
  const createMutation = useCreateBlogPost()
  const updateMutation = useUpdateBlogPost()

  // Author derived from authenticated user's profile
  const author = user ? `${user.firstName} ${user.lastName}`.trim() : ''

  const isEditing = !!editSlug
  const editingPost = posts?.find((p) => p.slug === editSlug)
  const isMutating = createMutation.isPending || updateMutation.isPending

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [editingSlug, setEditingSlug] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [readTimeMinutes, setReadTimeMinutes] = useState<number | ''>('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [publishedAt, setPublishedAt] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [isPublished, setIsPublished] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [htmlContent, setHtmlContent] = useState('')
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [bannerImage, setBannerImage] = useState<string | null>(null)

  // Editor mode: edit | split | preview
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')

  // Translation state
  const [translationsOpen, setTranslationsOpen] = useState(false)
  const [selectedLangs, setSelectedLangs] = useState<string[]>(SEO_NON_EN)
  const [showAllLangs, setShowAllLangs] = useState(false)
  const [langSearch, setLangSearch] = useState('')
  const { data: translations } = useBlogTranslations(editSlug ?? '')
  const translateMutation = useTranslateBlogPost()
  const deleteTranslationMutation = useDeleteBlogTranslation()
  const updateTranslationMutation = useUpdateBlogTranslation()

  // Edit translation dialog state
  const [editingTranslation, setEditingTranslation] = useState<{
    lang: string
    title: string
    excerpt: string
    content: string
  } | null>(null)

  const topLevelCategories = useMemo(
    () => allCategories.filter((c) => !c.parentId),
    [allCategories],
  )

  // When no DB categories exist yet, fall back to unique categories already in use by posts
  const effectiveTopLevel = useMemo(() => {
    if (topLevelCategories.length > 0) return topLevelCategories
    const unique = [...new Set((posts ?? []).map((p) => p.category).filter(Boolean))]
    return unique.map((label) => ({ id: label, label, slug: label, translations: {} as Record<string, string>, parentId: null }))
  }, [topLevelCategories, posts])

  const subcategoriesOfSelected = useMemo(() => {
    const selected = topLevelCategories.find((c) => c.label === category)
    if (!selected) return []
    return allCategories.filter((c) => c.parentId === selected.id)
  }, [allCategories, topLevelCategories, category])

  const excerptRef = useRef<HTMLTextAreaElement>(null)
  const initializedRef = useRef(false)

  // Auto-resize excerpt textarea
  const resizeExcerpt = useCallback(() => {
    const el = excerptRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    resizeExcerpt()
  }, [excerpt, resizeExcerpt])

  // Load editing post data — only once on first load, not on every refetch
  useEffect(() => {
    if (editingPost && !initializedRef.current) {
      initializedRef.current = true
      setTitle(editingPost.title)
      setSlug(editingPost.slug)
      setExcerpt(editingPost.excerpt)
      const parsedMinutes = parseInt(editingPost.readTime)
      setReadTimeMinutes(isNaN(parsedMinutes) ? '' : parsedMinutes)
      setCategory(editingPost.category)
      setSubcategory(editingPost.subcategory ?? '')
      setSelectedTags(editingPost.tags)
      setPublishedAt(editingPost.publishedAt)
      setIsPublished(editingPost.isPublished)
      setIsFeatured(editingPost.isFeatured ?? false)
      setHtmlContent(contentToHtml(editingPost.content))
      setCoverImage(editingPost.coverImage ?? null)
      setBannerImage(editingPost.bannerImage ?? null)
    }
  }, [editingPost])

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!isEditing) {
      setSlug(generateSlug(value))
    }
  }

  function calculateReadTime(html: string): number {
    const text = html.replace(/<[^>]*>/g, ' ')
    const words = text.split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / 200))
  }

  async function handleSave() {
    const content = htmlToContent(htmlContent)
    const readTime = `${readTimeMinutes || calculateReadTime(htmlContent)} min read`

    if (isEditing && editingPost) {
      const data: UpdateBlogPostDto = {
        title,
        slug,
        excerpt,
        author,
        readTime,
        category,
        subcategory: subcategory || undefined,
        tags: selectedTags,
        publishedAt,
        isPublished,
        isFeatured,
        content,
        coverImage:
          coverImage === null && editingPost.coverImage
            ? ''
            : (coverImage ?? undefined),
        bannerImage:
          bannerImage === null && editingPost.bannerImage
            ? ''
            : (bannerImage ?? undefined),
      }
      await updateMutation.mutateAsync({ slug: editingPost.slug, data })
    } else {
      const data: CreateBlogPostDto = {
        title,
        slug: slug || undefined,
        excerpt,
        readTime,
        category,
        subcategory: subcategory || undefined,
        tags: selectedTags,
        publishedAt,
        isPublished,
        isFeatured,
        content,
        coverImage: coverImage ?? undefined,
        bannerImage: bannerImage ?? undefined,
      }
      await createMutation.mutateAsync(data)
    }

    navigate({ to: withLocalePath('/admin/blog', currentLocale) as any })
  }

  function handleBack() {
    navigate({ to: withLocalePath('/admin/blog', currentLocale) as any })
  }

  const formattedDate = publishedAt
    ? new Date(publishedAt + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  return (
    <>
      {/* ── Sticky Save Bar ── */}
      <div className="sticky top-16 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="shrink-0"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('admin.editor.posts')}
            </Button>

            {slug && (
              <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex min-w-0">
                <LinkIcon className="h-3 w-3 shrink-0" />
                {editingSlug ? (
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    onBlur={() => setEditingSlug(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingSlug(false)}
                    autoFocus
                    className="bg-muted/50 rounded px-1.5 py-0.5 text-xs font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-[120px]"
                  />
                ) : (
                  <button
                    onClick={() => setEditingSlug(true)}
                    className="truncate font-mono hover:text-foreground transition-colors max-w-[200px]"
                    title={t('admin.editor.editSlug')}
                  >
                    {slug}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Mode selector */}
            <div className="hidden sm:flex items-center rounded-md border bg-muted/50 p-0.5">
              <button
                onClick={() => setEditorMode('edit')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                  editorMode === 'edit'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title={t('admin.editor.modes.editOnly')}
              >
                <PenLine className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('admin.editor.modes.edit')}</span>
              </button>
              <button
                onClick={() => setEditorMode('split')}
                className={cn(
                  'hidden lg:inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                  editorMode === 'split'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title={t('admin.editor.modes.sideBySide')}
              >
                <Columns2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('admin.editor.modes.split')}</span>
              </button>
              <button
                onClick={() => setEditorMode('preview')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                  editorMode === 'preview'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title={t('admin.editor.modes.previewOnly')}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('admin.editor.modes.preview')}</span>
              </button>
            </div>

            {/* Mobile toggle: edit/preview only */}
            <button
              onClick={() => setEditorMode(editorMode === 'preview' ? 'edit' : 'preview')}
              className="sm:hidden inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium"
            >
              {editorMode === 'preview' ? (
                <><PenLine className="h-3.5 w-3.5" /> {t('admin.editor.modes.edit')}</>
              ) : (
                <><Eye className="h-3.5 w-3.5" /> {t('admin.editor.modes.preview')}</>
              )}
            </button>

            <div className="flex items-center gap-2">
              {isPublished ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <Badge variant={isPublished ? 'default' : 'secondary'}>
                {isPublished ? t('admin.blog.published') : t('admin.blog.draft')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Star className={cn('h-4 w-4', isFeatured ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground')} />
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              <span className={cn(designSystem.typography.body.small, 'text-muted-foreground')}>
                {t('admin.blog.featured')}
              </span>
            </div>
            <Button
              onClick={handleSave}
              disabled={isMutating || !title}
              size="sm"
            >
              {isMutating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? t('admin.editor.update') : t('admin.editor.publish')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Editor / Preview Layout ── */}
      <PageContainer>
        <div
          className={cn(
            'mx-auto',
            editorMode === 'split' ? 'max-w-[1600px]' : 'max-w-5xl',
          )}
        >
          <div
            className={cn(
              editorMode === 'split' && 'grid grid-cols-2 gap-0 lg:gap-0',
            )}
          >
            {/* ── Editor Panel ── */}
            {editorMode !== 'preview' && (
              <div
                className={cn(
                  editorMode === 'split' && 'border-r pr-6 lg:pr-8',
                  'px-4 sm:px-6 lg:px-8',
                )}
              >
                <SectionContainer spacing="lg">
                  <article>
                    {/* ── Header — mirrors blog.$slug.tsx ── */}
                    <header className="mb-10">
                      {/* Image Uploads */}
                      <div className="mb-6 space-y-4">
                        <ImageCropUpload
                          aspectRatio={16 / 9}
                          label={t('admin.editor.coverImage', { defaultValue: 'Cover Image' })}
                          hint={t('admin.editor.coverHint', { defaultValue: 'Used on cards (16:9)' })}
                          value={coverImage}
                          onChange={setCoverImage}
                          previewHeight="h-48"
                        />
                        <ImageCropUpload
                          aspectRatio={21 / 9}
                          label={t('admin.editor.bannerImage', { defaultValue: 'Banner Image' })}
                          hint={t('admin.editor.bannerHint', { defaultValue: 'Article header (21:9)' })}
                          value={bannerImage}
                          onChange={setBannerImage}
                          previewHeight="h-36"
                        />
                      </div>

                      {/* Category */}
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Select
                          value={category}
                          onValueChange={(v) => {
                            setCategory(v)
                            setSubcategory('')
                          }}
                        >
                          <SelectTrigger className="h-auto w-auto border-none bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold shadow-none hover:bg-secondary focus:ring-1 focus:ring-primary/30 rounded-full">
                            <SelectValue placeholder={t('admin.editor.form.categoryPlaceholder', { defaultValue: 'Select category' })} />
                          </SelectTrigger>
                          <SelectContent>
                            {effectiveTopLevel.map((cat) => (
                              <SelectItem key={cat.id} value={cat.label}>
                                {localizeBlogCategory(allCategories, cat.label, currentLocale)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {subcategoriesOfSelected.length > 0 && (
                          <Select
                            value={subcategory || '__none__'}
                            onValueChange={(v) => setSubcategory(v === '__none__' ? '' : v)}
                          >
                            <SelectTrigger className="h-auto w-auto border-none bg-secondary/50 px-2.5 py-0.5 text-xs font-medium shadow-none hover:bg-secondary focus:ring-1 focus:ring-primary/30 rounded-full">
                              <SelectValue placeholder={t('admin.editor.form.subcategoryPlaceholder', { defaultValue: 'Subcategory (optional)' })} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                {t('admin.editor.form.noSubcategory', { defaultValue: 'None' })}
                              </SelectItem>
                              {subcategoriesOfSelected.map((sub) => (
                                <SelectItem key={sub.id} value={sub.label}>
                                  {localizeBlogCategory(allCategories, sub.label, currentLocale)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Title */}
                      <input
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder={t('admin.editor.form.titlePlaceholder')}
                        className={cn(
                          designSystem.typography.heading.h1,
                          'mb-4 leading-tight',
                          invisibleInput,
                          'placeholder:text-muted-foreground/30',
                        )}
                      />

                      {/* Excerpt */}
                      <textarea
                        ref={excerptRef}
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        placeholder={t('admin.editor.form.excerptPlaceholder')}
                        rows={1}
                        className={cn(
                          designSystem.typography.body.large,
                          designSystem.typography.muted,
                          'mb-6 resize-none overflow-hidden',
                          invisibleInput,
                          'placeholder:text-muted-foreground/30',
                        )}
                      />

                      {/* Meta row */}
                      <div
                        className={cn(
                          'flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center',
                          designSystem.spacing.gap.md,
                        )}
                      >
                        {/* Left: Author */}
                        <div
                          className={cn(
                            'flex items-center',
                            designSystem.spacing.gap.sm,
                          )}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {getAuthorInitials(author)}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <p
                              className={cn(
                                designSystem.typography.body.small,
                                'font-medium',
                              )}
                            >
                              {author || t('admin.editor.meta.unknownAuthor')}
                            </p>
                            <p
                              className={cn(
                                designSystem.typography.body.xs,
                                designSystem.typography.muted,
                              )}
                            >
                              {t('admin.editor.meta.publisher')}
                            </p>
                          </div>
                        </div>

                        {/* Right: Date + Read time */}
                        <div
                          className={cn(
                            'flex flex-wrap items-center',
                            designSystem.spacing.gap.md,
                          )}
                        >
                          <label
                            className={cn(
                              designSystem.typography.body.small,
                              designSystem.typography.muted,
                              'flex items-center cursor-pointer',
                            )}
                          >
                            <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                            <span className="relative">
                              <span className="pointer-events-none">
                                {formattedDate || t('admin.editor.form.pickDate')}
                              </span>
                              <input
                                type="date"
                                value={publishedAt}
                                onChange={(e) => setPublishedAt(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </span>
                          </label>

                          <div
                            className={cn(
                              designSystem.typography.body.small,
                              designSystem.typography.muted,
                              'flex items-center',
                            )}
                          >
                            <Clock3 className="mr-2 h-4 w-4 shrink-0" />
                            <input
                              type="number"
                              min={1}
                              value={readTimeMinutes}
                              onChange={(e) => setReadTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                              placeholder="min"
                              className={cn(
                                invisibleInput,
                                'w-12 text-sm text-muted-foreground placeholder:text-muted-foreground/30',
                              )}
                            />
                            <span className="text-sm text-muted-foreground/50 mr-1">min</span>
                            <button
                              type="button"
                              title="Auto-calculate from content"
                              onClick={() => setReadTimeMinutes(calculateReadTime(htmlContent))}
                              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </header>

                    {/* ── Content ── */}
                    <section className="mb-10">
                      <RichTextEditor
                        content={htmlContent}
                        onUpdate={setHtmlContent}
                        placeholder={t('admin.editor.form.contentPlaceholder')}
                        minHeight="400px"
                        onImageUpload={(file) => blogService.uploadImage(file)}
                      />
                    </section>

                    {/* ── Footer: Tags ── */}
                    <footer className="mb-12 border-t pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className={designSystem.typography.heading.h5}>
                          {t('admin.editor.tags.heading')}
                        </h2>
                        {selectedTags.length > 0 && (
                          <span className={cn(designSystem.typography.body.xs, 'text-muted-foreground tabular-nums')}>
                            {selectedTags.length} selected
                          </span>
                        )}
                      </div>

                      <TagCombobox
                        selectedTags={selectedTags}
                        onChange={setSelectedTags}
                        placeholder={t('admin.editor.tags.placeholder')}
                      />
                    </footer>
                  </article>
                </SectionContainer>
              </div>
            )}

            {/* ── Preview Panel ── */}
            {editorMode !== 'edit' && (
              <div
                className={cn(
                  editorMode === 'split' && 'pl-6 lg:pl-8 overflow-y-auto',
                  editorMode === 'preview' && 'px-4 sm:px-6 lg:px-8',
                )}
              >
                <SectionContainer spacing="lg">
                  {editorMode === 'split' && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      <span className="font-medium uppercase tracking-wider">{t('admin.editor.modes.preview')}</span>
                    </div>
                  )}
                  <BlogPostPreview
                    title={title}
                    excerpt={excerpt}
                    author={author}
                    category={category}
                    publishedAt={publishedAt}
                    readTime={`${readTimeMinutes || calculateReadTime(htmlContent)} min read`}
                    htmlContent={htmlContent}
                    tags={selectedTags}
                    locale={currentLocale}
                    coverImage={coverImage ?? undefined}
                    bannerImage={bannerImage ?? undefined}
                  />
                </SectionContainer>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* ── Translations Panel (only for existing posts) ── */}
          {isEditing && editingPost && (
            <section className="border-t pt-8 mt-8">
              <button
                onClick={() => setTranslationsOpen(!translationsOpen)}
                className="flex w-full items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Languages className="h-5 w-5 text-muted-foreground" />
                  <h2 className={designSystem.typography.heading.h4}>
                    {t('admin.editor.translations.heading')}
                  </h2>
                  {translations && Object.keys(translations).length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {Object.keys(translations).length}
                    </Badge>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform',
                    translationsOpen && 'rotate-180',
                  )}
                />
              </button>

              {translationsOpen && (
                <div className="mt-6 space-y-6">
                  {/* Auto-translate controls */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <p className={cn(designSystem.typography.body.small, 'font-medium')}>
                      {t('admin.editor.translations.autoTranslate')}
                    </p>

                    {/* Language selection */}
                    <div className="space-y-2">
                      {/* SEO priority locales row */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">SEO priority locales</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedLangs(SEO_NON_EN)}
                              className="text-xs text-primary hover:underline"
                            >
                              Select all
                            </button>
                            <span className="text-muted-foreground/40 text-xs">·</span>
                            <button
                              onClick={() => setSelectedLangs([])}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {SEO_NON_EN.map((code) => {
                            const lang = LANGUAGE_MAP.get(code)
                            const isSelected = selectedLangs.includes(code)
                            const hasTranslation = translations?.[code]
                            return (
                              <button
                                key={code}
                                onClick={() =>
                                  setSelectedLangs((prev) =>
                                    isSelected ? prev.filter((c) => c !== code) : [...prev, code],
                                  )
                                }
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                                  isSelected
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border hover:border-primary/40',
                                  hasTranslation && !isSelected && 'border-green-500/30 bg-green-500/5',
                                )}
                              >
                                {lang?.countryCode && (
                                  <span className="text-sm leading-none">
                                    {countryCodeToEmoji(lang.countryCode)}
                                  </span>
                                )}
                                {code}
                                {isSelected && <Check className="h-3 w-3" />}
                                {hasTranslation && !isSelected && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* All languages toggle */}
                      <button
                        onClick={() => { setShowAllLangs(!showAllLangs); setLangSearch('') }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ChevronDown className={cn('h-3 w-3 transition-transform', showAllLangs && 'rotate-180')} />
                        {showAllLangs ? 'Hide extra languages' : '+ Add more languages'}
                      </button>

                      {showAllLangs && (
                        <div className="space-y-1.5">
                          <input
                            value={langSearch}
                            onChange={(e) => setLangSearch(e.target.value)}
                            placeholder={t('admin.editor.translations.searchPlaceholder')}
                            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                            {LANGUAGES.filter(
                              (l) =>
                                l.code !== 'en-US' &&
                                !SEO_NON_EN.includes(l.code) &&
                                (langSearch === '' ||
                                  l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
                                  l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
                                  l.code.toLowerCase().includes(langSearch.toLowerCase())),
                            )
                              .slice(0, langSearch ? 100 : 30)
                              .map((lang) => {
                                const isSelected = selectedLangs.includes(lang.code)
                                const hasTranslation = translations?.[lang.code]
                                return (
                                  <button
                                    key={lang.code}
                                    onClick={() =>
                                      setSelectedLangs((prev) =>
                                        isSelected
                                          ? prev.filter((c) => c !== lang.code)
                                          : [...prev, lang.code],
                                      )
                                    }
                                    className={cn(
                                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                                      isSelected
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:border-primary/40',
                                      hasTranslation && !isSelected && 'border-green-500/30 bg-green-500/5',
                                    )}
                                  >
                                    {lang.countryCode && (
                                      <span className="text-sm leading-none">
                                        {countryCodeToEmoji(lang.countryCode)}
                                      </span>
                                    )}
                                    {lang.code}
                                    {isSelected && <Check className="h-3 w-3" />}
                                    {hasTranslation && !isSelected && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                    )}
                                  </button>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {selectedLangs.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              translateMutation.mutate({
                                slug: editingPost.slug,
                                languages: selectedLangs,
                              })
                              setSelectedLangs(SEO_NON_EN)
                              setShowAllLangs(false)
                            }}
                            disabled={translateMutation.isPending}
                          >
                            {translateMutation.isPending ? (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                              <Languages className="mr-2 h-3 w-3" />
                            )}
                            {t('admin.editor.translations.translate')} {selectedLangs.length}{' '}
                            {selectedLangs.length === 1
                              ? t('admin.editor.translations.language')
                              : t('admin.editor.translations.languages')}
                          </Button>
                          <button
                            onClick={() => setSelectedLangs([])}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            {t('admin.editor.translations.clear')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Existing translations */}
                  {translations && Object.keys(translations).length > 0 && (
                    <div className="space-y-2">
                      <p className={cn(designSystem.typography.body.small, 'font-medium')}>
                        {t('admin.editor.translations.existing')}
                      </p>
                      <div className="divide-y rounded-lg border">
                        {Object.entries(translations).map(([lang, translation]) => {
                          const meta = LANGUAGE_MAP.get(lang)
                          return (
                            <div
                              key={lang}
                              className="flex items-center justify-between px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {meta?.countryCode && (
                                  <span className="text-base leading-none">
                                    {countryCodeToEmoji(meta.countryCode)}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <span className="text-sm font-medium">
                                    {meta?.name ?? lang}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {translation.isAutoTranslated ? t('admin.editor.translations.auto') : t('admin.editor.translations.manual')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    setEditingTranslation({
                                      lang,
                                      title: translation.title,
                                      excerpt: translation.excerpt,
                                      content: contentToHtml(translation.content),
                                    })
                                  }
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  {t('admin.editor.translations.edit')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    const locale = TRANSLATOR_CODE_MAP.get(lang)?.code ?? lang
                                    const url = withLocalePath(
                                      `/blog/${editingPost.slug}`,
                                      locale,
                                    )
                                    window.open(url, '_blank')
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  {t('admin.editor.translations.preview')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-destructive hover:text-destructive"
                                  onClick={() =>
                                    deleteTranslationMutation.mutate({
                                      slug: editingPost.slug,
                                      lang,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </PageContainer>

      {/* ── Edit Translation Dialog ── */}
      {editingTranslation && editingPost && (
        <Dialog open onOpenChange={(v) => !v && setEditingTranslation(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{LANGUAGE_MAP.get(editingTranslation.lang)?.name ?? editingTranslation.lang}</span>
                <span className="text-xs font-mono text-muted-foreground">({editingTranslation.lang})</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('admin.editor.form.titlePlaceholder')}</label>
                <input
                  value={editingTranslation.title}
                  onChange={(e) => setEditingTranslation((prev) => prev && ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">{t('admin.editor.form.excerptPlaceholder')}</label>
                <textarea
                  value={editingTranslation.excerpt}
                  onChange={(e) => setEditingTranslation((prev) => prev && ({ ...prev, excerpt: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">{t('admin.editor.form.contentPlaceholder')}</label>
                <RichTextEditor
                  content={editingTranslation.content}
                  onUpdate={(html) => setEditingTranslation((prev) => prev && ({ ...prev, content: html }))}
                  minHeight="240px"
                  onImageUpload={(file) => blogService.uploadImage(file)}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingTranslation(null)}>
                {t('admin.blog.delete.cancel')}
              </Button>
              <Button
                disabled={updateTranslationMutation.isPending}
                onClick={async () => {
                  await updateTranslationMutation.mutateAsync({
                    slug: editingPost.slug,
                    lang: editingTranslation.lang,
                    data: {
                      title: editingTranslation.title,
                      excerpt: editingTranslation.excerpt,
                      content: htmlToContent(editingTranslation.content),
                    },
                  })
                  setEditingTranslation(null)
                }}
              >
                {updateTranslationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {t('admin.editor.update')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
