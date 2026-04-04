import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useTranslateCategory,
} from '@/hooks/useCategoryQueries'
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '@/services/category.service'
import { LANGUAGES, LANGUAGE_MAP } from '@/lib/languages'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, FolderTree, Loader2, Languages, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SEO_PRIORITY_LOCALES } from '@/lib/seo'
import { countryCodeToEmoji } from '@/lib/languages'
import type { TranslateCategoryTarget } from '@/services/category.service'

export const Route = createFileRoute('/{-$locale}/admin/categories')({
  component: AdminCategoriesPage,
})

const SEO_NON_EN: string[] = SEO_PRIORITY_LOCALES.filter((l) => l !== 'en-US')

const ALL_TARGETS: TranslateCategoryTarget[] = LANGUAGES
  .filter((l) => l.code !== 'en-US')
  .map((l) => ({ localeCode: l.code, translatorCode: l.translatorCode }))

function generateSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Create dialog ─────────────────────────────────────────────────────────────

function CreateCategoryDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  topLevelCategories,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (label: string, slug: string, parentId?: string) => void
  isPending: boolean
  topLevelCategories: Category[]
}) {
  const [label, setLabel] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState('__none__')

  function handleLabelChange(value: string) {
    setLabel(value)
    setSlug(generateSlug(value))
  }

  function handleClose() {
    setLabel('')
    setSlug('')
    setParentId('__none__')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Category</DialogTitle>
          <DialogDescription>
            After saving, open the category to add translations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Label (English)</label>
            <input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. AI Engineering"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. ai-engineering"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Parent Category (optional)</label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Top-level category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Top-level category</SelectItem>
                {topLevelCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => onSubmit(label, slug, parentId === '__none__' ? undefined : parentId)}
            disabled={isPending || !label.trim() || !slug.trim()}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function EditCategoryDialog({
  category,
  onClose,
  onSave,
  onTranslate,
  isSaving,
  isTranslating,
  topLevelCategories,
}: {
  category: Category
  onClose: () => void
  onSave: (data: UpdateCategoryDto & { translations: Record<string, string> }) => void
  onTranslate: (targets: TranslateCategoryTarget[]) => void
  isSaving: boolean
  isTranslating: boolean
  topLevelCategories: Category[]
}) {
  const [label, setLabel] = useState(category.label)
  const [slug, setSlug] = useState(category.slug)
  const [parentId, setParentId] = useState(category.parentId ?? '__none__')
  const [translations, setTranslations] = useState<Record<string, string>>(category.translations)
  const [selectedTargets, setSelectedTargets] = useState<string[]>(SEO_NON_EN)
  const [showAllLangs, setShowAllLangs] = useState(false)
  const [langSearch, setLangSearch] = useState('')

  function handleLabelChange(value: string) {
    setLabel(value)
    setTranslations((prev) => ({ ...prev, 'en-US': value }))
  }

  function setLocale(code: string, value: string) {
    setTranslations((prev) => ({ ...prev, [code]: value }))
  }

  const prevTranslations = category.translations
  if (prevTranslations !== translations && isTranslating === false) {
    if (Object.keys(prevTranslations).length > Object.keys(translations).length) {
      Object.assign(translations, prevTranslations)
    }
  }

  const filledCount = Object.values(translations).filter(Boolean).length

  // Don't allow a category to be its own parent
  const availableParents = topLevelCategories.filter((c) => c.id !== category.id)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-1">
          {/* Label + Slug */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Label (English)</label>
              <input
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Parent category */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Parent Category</label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Top-level category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Top-level category</SelectItem>
                {availableParents.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Translations */}
          <div className="space-y-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Translations</span>
                  <Badge variant="secondary" className="tabular-nums text-xs">
                    {filledCount} / {LANGUAGES.length}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const targets = ALL_TARGETS.filter((t) => selectedTargets.includes(t.localeCode))
                    onTranslate(targets)
                  }}
                  disabled={isTranslating || !label.trim() || selectedTargets.length === 0}
                >
                  {isTranslating ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Languages className="mr-2 h-3.5 w-3.5" />
                  )}
                  {isTranslating ? 'Translating…' : `Translate ${selectedTargets.length}`}
                </Button>
              </div>

              {/* SEO priority locale chips */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">SEO priority locales</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedTargets(SEO_NON_EN)} className="text-xs text-primary hover:underline">
                      Select all
                    </button>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <button onClick={() => setSelectedTargets([])} className="text-xs text-muted-foreground hover:text-foreground">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {SEO_NON_EN.map((code) => {
                    const lang = LANGUAGE_MAP.get(code)
                    const isSelected = selectedTargets.includes(code)
                    return (
                      <button
                        key={code}
                        onClick={() =>
                          setSelectedTargets((prev) =>
                            isSelected ? prev.filter((c) => c !== code) : [...prev, code],
                          )
                        }
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/40',
                        )}
                      >
                        {lang?.countryCode && (
                          <span className="text-sm leading-none">{countryCodeToEmoji(lang.countryCode)}</span>
                        )}
                        {code}
                        {isSelected && <Check className="h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* More languages toggle */}
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
                    placeholder="Search languages…"
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
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
                        const isSelected = selectedTargets.includes(lang.code)
                        return (
                          <button
                            key={lang.code}
                            onClick={() =>
                              setSelectedTargets((prev) =>
                                isSelected ? prev.filter((c) => c !== lang.code) : [...prev, lang.code],
                              )
                            }
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/40',
                            )}
                          >
                            {lang.countryCode && (
                              <span className="text-sm leading-none">{countryCodeToEmoji(lang.countryCode)}</span>
                            )}
                            {lang.code}
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border divide-y max-h-72 overflow-y-auto">
              {LANGUAGES.map((lang) => {
                const value = translations[lang.code] ?? ''
                const isMissing = !value
                return (
                  <div key={lang.code} className="flex items-center gap-2 px-3 py-1.5">
                    <span className={cn(
                      'w-16 shrink-0 text-xs font-mono',
                      isMissing ? 'text-muted-foreground/50' : 'text-muted-foreground',
                    )}>
                      {lang.code}
                    </span>
                    <input
                      value={value}
                      onChange={(e) => setLocale(lang.code, e.target.value)}
                      placeholder={lang.name}
                      disabled={isTranslating}
                      className={cn(
                        'flex-1 bg-transparent text-sm outline-none py-0.5',
                        'placeholder:text-muted-foreground/30',
                        isMissing && 'italic text-muted-foreground/50',
                        isTranslating && 'opacity-50',
                      )}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({ slug, label, translations, parentId: parentId === '__none__' ? undefined : parentId })}
            disabled={isSaving || !label.trim() || !slug.trim()}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

function AdminCategoriesPage() {
  const { data: categories, isLoading } = useAdminCategories()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()
  const translateMutation = useTranslateCategory()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)

  const topLevelCategories = (categories ?? []).filter((c) => !c.parentId)

  function getParentLabel(parentId: string | null): string {
    if (!parentId) return '—'
    const parent = categories?.find((c) => c.id === parentId)
    return parent?.label ?? parentId
  }

  async function handleCreate(label: string, slug: string, parentId?: string) {
    const dto: CreateCategoryDto = {
      slug,
      label,
      translations: { 'en-US': label },
      parentId: parentId || null,
    }
    await createMutation.mutateAsync(dto)
    setCreateOpen(false)
  }

  async function handleSave(data: UpdateCategoryDto & { translations: Record<string, string> }) {
    if (!editingCategory) return
    await updateMutation.mutateAsync({ id: editingCategory.id, data })
    setEditingCategory(null)
  }

  async function handleTranslate(targets: TranslateCategoryTarget[]) {
    if (!editingCategory) return
    const result = await translateMutation.mutateAsync({ id: editingCategory.id, targets })
    setEditingCategory(result)
  }

  async function handleDelete() {
    if (!deletingCategory) return
    await deleteMutation.mutateAsync(deletingCategory.id)
    setDeletingCategory(null)
  }

  return (
    <div className="py-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Category Management</h1>
          <p className="text-sm text-muted-foreground">
            Create categories and subcategories, auto-translate, and manage translations.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            All Categories
            {categories && (
              <Badge variant="secondary" className="ml-2">{categories.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No categories yet.</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Category
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Translations</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => {
                    const localeCount = Object.values(cat.translations).filter(Boolean).length
                    const total = LANGUAGES.length
                    const complete = localeCount >= total
                    return (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">
                          {cat.parentId && (
                            <span className="mr-1 text-muted-foreground">↳</span>
                          )}
                          {cat.label}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {cat.slug}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getParentLabel(cat.parentId)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={complete ? 'default' : localeCount > 1 ? 'secondary' : 'outline'}
                            className="tabular-nums"
                          >
                            {localeCount} / {total}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCategory(cat)}
                              title="Edit & manage translations"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingCategory(cat)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCategoryDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        topLevelCategories={topLevelCategories}
      />

      {editingCategory && (
        <EditCategoryDialog
          key={editingCategory.id}
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={handleSave}
          onTranslate={handleTranslate}
          isSaving={updateMutation.isPending}
          isTranslating={translateMutation.isPending}
          topLevelCategories={topLevelCategories}
        />
      )}

      <Dialog open={!!deletingCategory} onOpenChange={(v) => !v && setDeletingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this category?</DialogTitle>
            <DialogDescription>
              Posts using <strong>{deletingCategory?.label}</strong> will show the raw label as a
              fallback. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCategory(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
