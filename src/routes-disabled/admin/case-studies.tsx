import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import {
  useAdminCaseStudies,
  useDeleteCaseStudy,
  useSeedCaseStudies,
} from '@/hooks/useCaseStudyQueries'
import type { CreateCaseStudyDto } from '@/services/case-study.service'
import { caseStudies } from '@/data/case-studies'
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
  Trash2,
  FileText,
  Upload,
  Loader2,
} from 'lucide-react'

export const Route = createFileRoute('/{-$locale}/admin/case-studies')({
  component: AdminCaseStudiesPage,
})

function AdminCaseStudiesPage() {
  const { t } = useTranslation('pages')
  const currentLocale = getLocaleFromPath(window.location.pathname)

  const { data: items } = useAdminCaseStudies()
  const deleteMutation = useDeleteCaseStudy()
  const seedMutation = useSeedCaseStudies()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)

  const sortedItems = useMemo(() => {
    if (!items) return []
    return [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [items])

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

  async function handleSeed() {
    const seedData: CreateCaseStudyDto[] = caseStudies.map((cs) => ({
      slug: cs.slug,
      title: cs.title,
      client: cs.client,
      industry: cs.industry,
      description: cs.description,
      executiveSummary: cs.executiveSummary,
      challenge: cs.challenge,
      solution: cs.solution,
      architectureDecisions: cs.architectureDecisions,
      techStack: cs.techStack,
      results: cs.results,
      tags: cs.tags,
      isPublished: true,
    }))
    await seedMutation.mutateAsync(seedData)
  }

  const editorPath = withLocalePath('/admin/case-studies/editor', currentLocale)

  return (
    <div className="py-6 lg:py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('admin.caseStudies.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('admin.caseStudies.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSeed} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {t('admin.caseStudies.seedData')}
            </Button>
            <Button asChild>
              <Link to={editorPath as any}>
                <Plus className="mr-2 h-4 w-4" />
                {t('admin.caseStudies.newCaseStudy')}
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
            {t('admin.caseStudies.allCaseStudies')}
            {items && (
              <Badge variant="secondary" className="ml-2">
                {items.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!items ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">{t('admin.caseStudies.empty.message')}</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleSeed}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('admin.caseStudies.empty.seed')}
                </Button>
                <Button asChild>
                  <Link to={editorPath as any}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('admin.caseStudies.empty.create')}
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[300px]">{t('admin.caseStudies.table.title')}</TableHead>
                    <TableHead>{t('admin.caseStudies.table.industry')}</TableHead>
                    <TableHead>{t('admin.caseStudies.table.client')}</TableHead>
                    <TableHead>{t('admin.caseStudies.table.status')}</TableHead>
                    <TableHead className="text-right">{t('admin.caseStudies.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow key={item.slug}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.title}</span>
                          <p className="text-xs text-muted-foreground">{item.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.industry}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{item.client}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isPublished ? 'default' : 'secondary'}>
                          {item.isPublished ? t('admin.caseStudies.published') : t('admin.caseStudies.draft')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`${editorPath}?slug=${item.slug}` as any}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(item.slug)}
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
            <DialogTitle>{t('admin.caseStudies.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.caseStudies.delete.confirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('admin.caseStudies.delete.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('admin.caseStudies.delete.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
