import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { localizeBlogCategory } from '@/lib/blog-i18n'
import { useAuth } from '@/contexts/AuthContext'
import {
  useAdminBlogPosts,
  useDeleteBlogPost,
  useUpdateBlogPost,
  useSeedBlogPosts,
} from '@/hooks/useBlogQueries'
import { usePublicCategories } from '@/hooks/useCategoryQueries'
import type { AdminBlogPost, CreateBlogPostDto } from '@/services/blog.service'
import { cn } from '@/lib/utils'
import { BLOG_POSTS } from '@/data/blog-posts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Pencil,
  Star,
  Trash2,
  FileText,
  Upload,
  Loader2,
} from 'lucide-react'

export const Route = createFileRoute('/{-$locale}/admin/blog')({
  component: AdminBlogPage,
})

function AdminBlogPage() {
  const { t } = useTranslation(['pages', 'blog'])
  const blogT = (key: string, options?: Record<string, unknown>) => t(key, { ...options, ns: 'blog' })
  const currentLocale = getLocaleFromPath(window.location.pathname)
  const { user, hasPermission } = useAuth()
  const canManageAllBlogs = hasPermission('manage:blog')

  const { data: posts } = useAdminBlogPosts()
  const { data: allCategories = [] } = usePublicCategories()
  const deleteMutation = useDeleteBlogPost()
  const updateMutation = useUpdateBlogPost()
  const seedMutation = useSeedBlogPosts()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)

  const sortedPosts = useMemo(() => {
    if (!posts) return []
    const filtered = canManageAllBlogs
      ? posts
      : posts.filter((p) => p.authorId === user?.id)
    return [...filtered].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
  }, [posts, canManageAllBlogs, user?.id])

  function openDeleteDialog(slug: string) {
    setDeletingSlug(slug)
    setDeleteDialogOpen(true)
  }

  async function handleDelete() {
    if (!deletingSlug) return
    await deleteMutation.mutateAsync(deletingSlug)
    setDeleteDialogOpen(false)
    setDeletingSlug(null)
  }

  async function handleToggleFeatured(post: AdminBlogPost) {
    try {
      await updateMutation.mutateAsync({
        slug: post.slug,
        data: { isFeatured: !post.isFeatured },
      })
    } catch (err) {
      console.error('Failed to toggle featured:', err)
    }
  }

  async function handleSeed() {
    const seedData: CreateBlogPostDto[] = BLOG_POSTS.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt,
      author: post.author,
      readTime: post.readTime,
      category: post.category,
      tags: post.tags,
      content: post.content,
      isPublished: true,
    }))
    await seedMutation.mutateAsync(seedData)
  }

  const editorPath = withLocalePath('/admin/blog/editor', currentLocale)

  return (
    <div className="py-6 lg:py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('admin.blog.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('admin.blog.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            {canManageAllBlogs && (
              <Button variant="outline" onClick={handleSeed} disabled={seedMutation.isPending}>
                {seedMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {t('admin.blog.seedData')}
              </Button>
            )}
            <Button asChild>
              <Link to={editorPath as any}>
                <Plus className="mr-2 h-4 w-4" />
                {t('admin.blog.newPost')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('admin.blog.allPosts')}
            {posts && (
              <Badge variant="secondary" className="ml-2">
                {sortedPosts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!posts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">{t('admin.blog.empty.message')}</p>
              <div className="flex justify-center gap-2">
                {canManageAllBlogs && (
                  <Button variant="outline" onClick={handleSeed}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('admin.blog.empty.seed')}
                  </Button>
                )}
                <Button asChild>
                  <Link to={editorPath as any}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('admin.blog.empty.create')}
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[300px]">{t('admin.blog.table.title')}</TableHead>
                    <TableHead>{t('admin.blog.table.category')}</TableHead>
                    <TableHead>{t('admin.blog.table.status')}</TableHead>
                    <TableHead>{t('admin.blog.table.date')}</TableHead>
                    <TableHead className="text-right">{t('admin.blog.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPosts.map((post) => (
                    <TableRow key={post.slug}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            {post.isFeatured && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                            )}
                            <span className="font-medium">{post.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{post.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{localizeBlogCategory(allCategories, post.category, currentLocale)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.isPublished ? 'default' : 'secondary'}>
                          {post.isPublished ? t('admin.blog.published') : t('admin.blog.draft')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {post.publishedAt}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFeatured(post)}
                            title={post.isFeatured ? t('admin.blog.removeFeatured') : t('admin.blog.setFeatured')}
                          >
                            <Star className={cn('h-4 w-4', post.isFeatured ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground')} />
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`${editorPath}?slug=${post.slug}` as any}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(post.slug)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.blog.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.blog.delete.confirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('admin.blog.delete.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('admin.blog.delete.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
