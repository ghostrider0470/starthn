import { createFileRoute, Link, redirect, useLocation } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronDown,
  Save,
  Loader2,
  Eye,
  PenLine,
  Columns2,
  ExternalLink,
  Languages,
  Check,
  Pencil,
  Trash2,
} from 'lucide-react'
import authService from '@/services/auth.service'
import profileService from '@/services/profile.service'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { BlogProseContent } from '@/components/blog/BlogProseContent'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { LANGUAGES, LANGUAGE_MAP, countryCodeToEmoji } from '@/lib/languages'
import { SEO_PRIORITY_LOCALES } from '@/lib/seo'
import { TRANSLATOR_CODE_MAP } from '@/lib/languages'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

type EditorMode = 'edit' | 'split' | 'preview'

interface PageTranslation {
  bio: string
  pageContent: string
  isAutoTranslated: boolean
  translatedAt: string
}

const SEO_NON_EN: string[] = SEO_PRIORITY_LOCALES.filter((l) => l !== 'en-US')

export const Route = createFileRoute('/{-$locale}/my-page')({
  beforeLoad: ({ location }) => {
    if (!authService.isAuthenticated()) {
      throw redirect({
        to: '/login' as any,
        search: { redirect: location.pathname } as any,
        replace: true,
      })
    }
  },
  component: MyPageEditor,
})

function MyPageEditor() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const { user, refreshProfile } = useAuth()
  const queryClient = useQueryClient()

  const [pageContent, setPageContent] = useState('')
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Translation state
  const [translationsOpen, setTranslationsOpen] = useState(false)
  const [selectedLangs, setSelectedLangs] = useState<string[]>(SEO_NON_EN)
  const [showAllLangs, setShowAllLangs] = useState(false)
  const [langSearch, setLangSearch] = useState('')
  const [editingTranslation, setEditingTranslation] = useState<{
    lang: string
    bio: string
    pageContent: string
  } | null>(null)

  // Fetch page translations
  const { data: translations } = useQuery({
    queryKey: ['page-translations'],
    queryFn: () => api.get<Record<string, PageTranslation>>('/user/page/translations').then((r) => r.data),
    enabled: !!user,
  })

  // Translate mutation
  const translateMutation = useMutation({
    mutationFn: (languages: string[]) =>
      api.post('/user/page/translate', { languages }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['page-translations'] }),
  })

  // Delete translation mutation
  const deleteTranslationMutation = useMutation({
    mutationFn: (lang: string) => api.delete(`/user/page/translations/${lang}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['page-translations'] }),
  })

  // Update translation mutation
  const updateTranslationMutation = useMutation({
    mutationFn: ({ lang, data }: { lang: string; data: { bio?: string; pageContent?: string } }) =>
      api.put(`/user/page/translations/${lang}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-translations'] })
      setEditingTranslation(null)
    },
  })

  useEffect(() => {
    if (user?.pageContent) {
      setPageContent(user.pageContent)
    }
  }, [user?.pageContent])

  async function handleSave() {
    setError(null)
    setSuccess(null)
    try {
      setIsSaving(true)
      await profileService.updateProfile({
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        pageContent,
      })
      await refreshProfile()
      setSuccess('Page saved successfully.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save page.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleImageUpload(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('image', file)
    const res = await api.post<{ url: string }>('/user/page-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  const slug = user?.slug
  const liveUrl = slug ? withLocalePath(`/team/${slug}`, currentLocale) : null

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky Header Bar ── */}
      <div className="sticky top-16 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link to={withLocalePath('/profile', currentLocale)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Profile
              </Link>
            </Button>
            <span className="hidden sm:inline text-sm font-medium text-muted-foreground">
              My Page
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop mode selector */}
            <div className="hidden sm:flex items-center rounded-md border bg-muted/50 p-0.5">
              <button
                onClick={() => setEditorMode('edit')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                  editorMode === 'edit' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <PenLine className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Edit</span>
              </button>
              <button
                onClick={() => setEditorMode('split')}
                className={cn(
                  'hidden lg:inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                  editorMode === 'split' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Columns2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Split</span>
              </button>
              <button
                onClick={() => setEditorMode('preview')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                  editorMode === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Preview</span>
              </button>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setEditorMode(editorMode === 'preview' ? 'edit' : 'preview')}
              className="sm:hidden inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium"
            >
              {editorMode === 'preview' ? (
                <><PenLine className="h-3.5 w-3.5" /> Edit</>
              ) : (
                <><Eye className="h-3.5 w-3.5" /> Preview</>
              )}
            </button>

            {liveUrl && (
              <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                <Link to={liveUrl}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  View live
                </Link>
              </Button>
            )}

            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* ── Feedback ── */}
      {(success || error) && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="mx-auto max-w-5xl">
            {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>
        </div>
      )}

      {/* ── Editor / Preview Layout ── */}
      <PageContainer>
        <div className={cn('mx-auto', editorMode === 'split' ? 'max-w-[1600px]' : 'max-w-5xl')}>
          <div className={cn(editorMode === 'split' && 'grid grid-cols-2 gap-0 lg:gap-0')}>
            {/* Editor Panel */}
            {editorMode !== 'preview' && (
              <div className={cn(editorMode === 'split' && 'border-r pr-6 lg:pr-8', 'px-4 sm:px-6 lg:px-8')}>
                <SectionContainer spacing="lg">
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-1">{user?.firstName} {user?.lastName}</h1>
                    {user?.profession && <p className="text-muted-foreground">{user.profession}</p>}
                  </div>
                  <RichTextEditor
                    content={pageContent}
                    onUpdate={setPageContent}
                    placeholder="Write about yourself, your experience, and expertise..."
                    minHeight="500px"
                    onImageUpload={handleImageUpload}
                  />
                </SectionContainer>
              </div>
            )}

            {/* Preview Panel */}
            {(editorMode === 'preview' || editorMode === 'split') && (
              <div className={cn(editorMode === 'split' && 'pl-6 lg:pl-8', 'px-4 sm:px-6 lg:px-8')}>
                <SectionContainer spacing="lg">
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-1">{user?.firstName} {user?.lastName}</h1>
                    {user?.profession && <p className="text-muted-foreground">{user.profession}</p>}
                    <p className="text-xs text-muted-foreground mt-2">Preview — this is how your page appears on /team/{slug}</p>
                  </div>
                  {pageContent ? (
                    <BlogProseContent content={[pageContent]} slug={slug ?? 'preview'} />
                  ) : (
                    <p className="text-muted-foreground italic py-12 text-center">Start writing to see the preview...</p>
                  )}
                </SectionContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── Translations Panel ── */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <section className="border-t pt-8 mt-8">
            <button
              onClick={() => setTranslationsOpen(!translationsOpen)}
              className="flex w-full items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-muted-foreground" />
                <h2 className={designSystem.typography.heading.h4}>Translations</h2>
                {translations && Object.keys(translations).length > 0 && (
                  <Badge variant="secondary" className="text-xs">{Object.keys(translations).length}</Badge>
                )}
              </div>
              <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', translationsOpen && 'rotate-180')} />
            </button>

            {translationsOpen && (
              <div className="mt-6 space-y-6">
                {/* Auto-translate controls */}
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <p className={cn(designSystem.typography.body.small, 'font-medium')}>Auto-translate your page</p>

                  {/* SEO priority locales */}
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">SEO priority locales</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedLangs(SEO_NON_EN)} className="text-xs text-primary hover:underline">Select all</button>
                          <span className="text-muted-foreground/40 text-xs">·</span>
                          <button onClick={() => setSelectedLangs([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
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
                              onClick={() => setSelectedLangs((prev) => isSelected ? prev.filter((c) => c !== code) : [...prev, code])}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                                isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40',
                                hasTranslation && !isSelected && 'border-green-500/30 bg-green-500/5',
                              )}
                            >
                              {lang?.countryCode && <span className="text-sm leading-none">{countryCodeToEmoji(lang.countryCode)}</span>}
                              {code}
                              {isSelected && <Check className="h-3 w-3" />}
                              {hasTranslation && !isSelected && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
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
                          placeholder="Search languages..."
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
                                  onClick={() => setSelectedLangs((prev) => isSelected ? prev.filter((c) => c !== lang.code) : [...prev, lang.code])}
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                                    isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40',
                                    hasTranslation && !isSelected && 'border-green-500/30 bg-green-500/5',
                                  )}
                                >
                                  {lang.countryCode && <span className="text-sm leading-none">{countryCodeToEmoji(lang.countryCode)}</span>}
                                  {lang.code}
                                  {isSelected && <Check className="h-3 w-3" />}
                                  {hasTranslation && !isSelected && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
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
                            translateMutation.mutate(selectedLangs)
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
                          Translate {selectedLangs.length} {selectedLangs.length === 1 ? 'language' : 'languages'}
                        </Button>
                        <button onClick={() => setSelectedLangs([])} className="text-xs text-muted-foreground hover:text-foreground">
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Existing translations */}
                {translations && Object.keys(translations).length > 0 && (
                  <div className="space-y-2">
                    <p className={cn(designSystem.typography.body.small, 'font-medium')}>Existing translations</p>
                    <div className="divide-y rounded-lg border">
                      {Object.entries(translations).map(([lang, translation]) => {
                        const meta = LANGUAGE_MAP.get(lang)
                        return (
                          <div key={lang} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {meta?.countryCode && <span className="text-base leading-none">{countryCodeToEmoji(meta.countryCode)}</span>}
                              <div className="min-w-0">
                                <span className="text-sm font-medium">{meta?.name ?? lang}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {translation.isAutoTranslated ? 'Auto' : 'Manual'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEditingTranslation({ lang, bio: translation.bio, pageContent: translation.pageContent })}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  const locale = TRANSLATOR_CODE_MAP.get(lang)?.code ?? lang
                                  const url = withLocalePath(`/team/${slug}`, locale)
                                  window.open(url, '_blank')
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => deleteTranslationMutation.mutate(lang)}
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
        </div>
      </PageContainer>

      {/* ── Edit Translation Dialog ── */}
      {editingTranslation && (
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
                <label className="text-sm font-medium">Bio</label>
                <textarea
                  value={editingTranslation.bio}
                  onChange={(e) => setEditingTranslation({ ...editingTranslation, bio: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Page Content</label>
                <textarea
                  value={editingTranslation.pageContent}
                  onChange={(e) => setEditingTranslation({ ...editingTranslation, pageContent: e.target.value })}
                  rows={12}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTranslation(null)}>Cancel</Button>
              <Button
                onClick={() =>
                  updateTranslationMutation.mutate({
                    lang: editingTranslation.lang,
                    data: { bio: editingTranslation.bio, pageContent: editingTranslation.pageContent },
                  })
                }
                disabled={updateTranslationMutation.isPending}
              >
                {updateTranslationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Translation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
