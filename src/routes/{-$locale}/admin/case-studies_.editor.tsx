import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import {
  useAdminCaseStudies,
  useCreateCaseStudy,
  useUpdateCaseStudy,
} from '@/hooks/useCaseStudyQueries'
import type {
  CreateCaseStudyDto,
  UpdateCaseStudyDto,
  CaseStudyArchitectureDecision,
  CaseStudyResult,
} from '@/services/case-study.service'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/admin/case-studies_/editor')({
  component: CaseStudyEditorPage,
})

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const INDUSTRIES = [
  { value: 'fintech', label: 'FinTech' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'government', label: 'Government' },
]

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30'
const textareaClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none'
const labelClass = 'text-sm font-medium'

function CaseStudyEditorPage() {
  const { t } = useTranslation('pages')
  const currentLocale = getLocaleFromPath(window.location.pathname)
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(window.location.search)
  const editSlug = searchParams.get('slug')

  const { data: items } = useAdminCaseStudies()
  const createMutation = useCreateCaseStudy()
  const updateMutation = useUpdateCaseStudy()

  const isEditing = !!editSlug
  const editingItem = items?.find((item) => item.slug === editSlug)
  const isMutating = createMutation.isPending || updateMutation.isPending

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [client, setClient] = useState('')
  const [industry, setIndustry] = useState('')
  const [description, setDescription] = useState('')
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [challenge, setChallenge] = useState('')
  const [solution, setSolution] = useState('')
  const [architectureDecisions, setArchitectureDecisions] = useState<CaseStudyArchitectureDecision[]>([])
  const [techStack, setTechStack] = useState<string[]>([])
  const [techInput, setTechInput] = useState('')
  const [results, setResults] = useState<CaseStudyResult[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)

  const initializedRef = useRef(false)

  // Load editing data
  useEffect(() => {
    if (editingItem && !initializedRef.current) {
      initializedRef.current = true
      setTitle(editingItem.title)
      setSlug(editingItem.slug)
      setClient(editingItem.client)
      setIndustry(editingItem.industry)
      setDescription(editingItem.description)
      setExecutiveSummary(editingItem.executiveSummary)
      setChallenge(editingItem.challenge)
      setSolution(editingItem.solution)
      setArchitectureDecisions(editingItem.architectureDecisions)
      setTechStack(editingItem.techStack)
      setResults(editingItem.results)
      setTags(editingItem.tags)
      setIsPublished(editingItem.isPublished)
      setIsFeatured(editingItem.isFeatured)
    }
  }, [editingItem])

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!isEditing) {
      setSlug(generateSlug(value))
    }
  }

  // Architecture decisions helpers
  function addArchDecision() {
    setArchitectureDecisions((prev) => [...prev, { decision: '', rationale: '' }])
  }
  function removeArchDecision(index: number) {
    setArchitectureDecisions((prev) => prev.filter((_, i) => i !== index))
  }
  function updateArchDecision(index: number, field: keyof CaseStudyArchitectureDecision, value: string) {
    setArchitectureDecisions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  // Results helpers
  function addResult() {
    setResults((prev) => [...prev, { metric: '', value: '', description: '' }])
  }
  function removeResult(index: number) {
    setResults((prev) => prev.filter((_, i) => i !== index))
  }
  function updateResult(index: number, field: keyof CaseStudyResult, value: string) {
    setResults((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  // Tech stack helpers
  function addTech() {
    const trimmed = techInput.trim()
    if (trimmed && !techStack.includes(trimmed)) {
      setTechStack((prev) => [...prev, trimmed])
      setTechInput('')
    }
  }
  function removeTech(index: number) {
    setTechStack((prev) => prev.filter((_, i) => i !== index))
  }

  // Tag helpers
  function addTag() {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
      setTagInput('')
    }
  }
  function removeTag(index: number) {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (isEditing && editingItem) {
      const data: UpdateCaseStudyDto = {
        title,
        slug,
        client,
        industry,
        description,
        executiveSummary,
        challenge,
        solution,
        architectureDecisions,
        techStack,
        results,
        tags,
        isPublished,
        isFeatured,
      }
      await updateMutation.mutateAsync({ slug: editingItem.slug, data })
    } else {
      const data: CreateCaseStudyDto = {
        title,
        slug: slug || undefined,
        client,
        industry,
        description,
        executiveSummary,
        challenge,
        solution,
        architectureDecisions,
        techStack,
        results,
        tags,
        isPublished,
        isFeatured,
      }
      await createMutation.mutateAsync(data)
    }

    navigate({ to: withLocalePath('/admin/case-studies', currentLocale) as any })
  }

  function handleBack() {
    navigate({ to: withLocalePath('/admin/case-studies', currentLocale) as any })
  }

  return (
    <>
      {/* Sticky Save Bar */}
      <div className="sticky top-16 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={handleBack} className="shrink-0">
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('admin.caseStudyEditor.back')}
            </Button>
            {slug && (
              <span className="hidden sm:block text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                {slug}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isPublished ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <Badge variant={isPublished ? 'default' : 'secondary'}>
                {isPublished ? t('admin.caseStudyEditor.published') : t('admin.caseStudyEditor.draft')}
              </Badge>
            </div>
            <Button onClick={handleSave} disabled={isMutating || !title} size="sm">
              {isMutating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? t('admin.caseStudyEditor.update') : t('admin.caseStudyEditor.create')}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Form */}
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Section 1: Basic Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{t('admin.caseStudyEditor.sections.basicInfo')}</h2>

          <div className="space-y-1">
            <label className={labelClass}>{t('admin.caseStudyEditor.fields.title')}</label>
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t('admin.caseStudyEditor.fields.titlePlaceholder')}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>{t('admin.caseStudyEditor.fields.slug')}</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t('admin.caseStudyEditor.fields.slugPlaceholder')}
              className={cn(inputClass, 'font-mono text-xs')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>{t('admin.caseStudyEditor.fields.client')}</label>
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder={t('admin.caseStudyEditor.fields.clientPlaceholder')}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>{t('admin.caseStudyEditor.fields.industry')}</label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.caseStudyEditor.fields.industryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>{t('admin.caseStudyEditor.fields.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('admin.caseStudyEditor.fields.descriptionPlaceholder')}
              rows={3}
              className={textareaClass}
            />
          </div>
        </section>

        {/* Section 2: Narrative */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{t('admin.caseStudyEditor.sections.narrative')}</h2>

          <div className="space-y-1">
            <label className={labelClass}>{t('admin.caseStudyEditor.fields.executiveSummary')}</label>
            <textarea
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              placeholder={t('admin.caseStudyEditor.fields.executiveSummaryPlaceholder')}
              rows={4}
              className={textareaClass}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>{t('admin.caseStudyEditor.fields.challenge')}</label>
            <textarea
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder={t('admin.caseStudyEditor.fields.challengePlaceholder')}
              rows={4}
              className={textareaClass}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>{t('admin.caseStudyEditor.fields.solution')}</label>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder={t('admin.caseStudyEditor.fields.solutionPlaceholder')}
              rows={4}
              className={textareaClass}
            />
          </div>
        </section>

        {/* Section 3: Architecture Decisions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold">{t('admin.caseStudyEditor.sections.architectureDecisions')}</h2>
            <Button variant="outline" size="sm" onClick={addArchDecision}>
              <Plus className="mr-1 h-4 w-4" />
              {t('admin.caseStudyEditor.add')}
            </Button>
          </div>

          {architectureDecisions.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('admin.caseStudyEditor.noArchDecisions')}</p>
          )}

          {architectureDecisions.map((ad, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t('admin.caseStudyEditor.decisionLabel', { number: i + 1 })}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeArchDecision(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>{t('admin.caseStudyEditor.fields.decision')}</label>
                <input
                  value={ad.decision}
                  onChange={(e) => updateArchDecision(i, 'decision', e.target.value)}
                  placeholder={t('admin.caseStudyEditor.fields.decisionPlaceholder')}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>{t('admin.caseStudyEditor.fields.rationale')}</label>
                <textarea
                  value={ad.rationale}
                  onChange={(e) => updateArchDecision(i, 'rationale', e.target.value)}
                  placeholder={t('admin.caseStudyEditor.fields.rationalePlaceholder')}
                  rows={2}
                  className={textareaClass}
                />
              </div>
            </div>
          ))}
        </section>

        {/* Section 4: Tech Stack */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{t('admin.caseStudyEditor.sections.techStack')}</h2>

          <div className="flex gap-2">
            <input
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTech()
                }
              }}
              placeholder={t('admin.caseStudyEditor.fields.techPlaceholder')}
              className={cn(inputClass, 'flex-1')}
            />
            <Button variant="outline" size="sm" onClick={addTech}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {techStack.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {tech}
                  <button onClick={() => removeTech(i)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* Section 5: Results */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold">{t('admin.caseStudyEditor.sections.results')}</h2>
            <Button variant="outline" size="sm" onClick={addResult}>
              <Plus className="mr-1 h-4 w-4" />
              {t('admin.caseStudyEditor.add')}
            </Button>
          </div>

          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('admin.caseStudyEditor.noResults')}</p>
          )}

          {results.map((result, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t('admin.caseStudyEditor.resultLabel', { number: i + 1 })}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeResult(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelClass}>{t('admin.caseStudyEditor.fields.metric')}</label>
                  <input
                    value={result.metric}
                    onChange={(e) => updateResult(i, 'metric', e.target.value)}
                    placeholder={t('admin.caseStudyEditor.fields.metricPlaceholder')}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>{t('admin.caseStudyEditor.fields.value')}</label>
                  <input
                    value={result.value}
                    onChange={(e) => updateResult(i, 'value', e.target.value)}
                    placeholder={t('admin.caseStudyEditor.fields.valuePlaceholder')}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>{t('admin.caseStudyEditor.fields.resultDescription')}</label>
                <textarea
                  value={result.description}
                  onChange={(e) => updateResult(i, 'description', e.target.value)}
                  placeholder={t('admin.caseStudyEditor.fields.resultDescriptionPlaceholder')}
                  rows={2}
                  className={textareaClass}
                />
              </div>
            </div>
          ))}
        </section>

        {/* Section 6: Tags */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{t('admin.caseStudyEditor.sections.tags')}</h2>

          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder={t('admin.caseStudyEditor.fields.tagPlaceholder')}
              className={cn(inputClass, 'flex-1')}
            />
            <Button variant="outline" size="sm" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button onClick={() => removeTag(i)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* Section 7: Controls */}
        <section className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={labelClass}>{t('admin.caseStudyEditor.controls.published')}</p>
              <p className="text-xs text-muted-foreground">{t('admin.caseStudyEditor.controls.publishedDescription')}</p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={labelClass}>{t('admin.caseStudyEditor.controls.featured')}</p>
              <p className="text-xs text-muted-foreground">{t('admin.caseStudyEditor.controls.featuredDescription')}</p>
            </div>
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
          </div>
        </section>
      </div>
    </>
  )
}
