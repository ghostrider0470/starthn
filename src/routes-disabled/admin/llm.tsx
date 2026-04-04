import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  useLlmProviders,
  useLlmSettings,
  useCreateLlmProvider,
  useUpdateLlmProvider,
  useDeleteLlmProvider,
  useUpdateLlmSettings,
} from '@/hooks/useLlmQueries'
import type { LlmProvider, LlmModel, LlmApiType, CreateLlmProviderDto, UpdateLlmProviderDto } from '@/services/llm.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
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
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Bot,
  Cpu,
  X,
  ChevronDown,
  ChevronRight,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/admin/llm')({
  component: AdminLlmPage,
})

function generateKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Model row editor ──────────────────────────────────────────────────────────

function ModelRow({
  model,
  onUpdate,
  onRemove,
}: {
  model: LlmModel
  onUpdate: (m: LlmModel) => void
  onRemove: () => void
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
      <input
        value={model.id}
        onChange={(e) => onUpdate({ ...model, id: e.target.value })}
        placeholder="model-id (e.g. claude-sonnet-4-6)"
        className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <input
        value={model.name}
        onChange={(e) => onUpdate({ ...model, name: e.target.value })}
        placeholder="Display name"
        className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <input
        type="number"
        value={model.maxTokens}
        onChange={(e) => onUpdate({ ...model, maxTokens: Number(e.target.value) })}
        className="w-20 rounded-md border bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
        title="Max tokens"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Header row editor ─────────────────────────────────────────────────────────

function HeaderRow({
  headerKey,
  value,
  onUpdate,
  onRemove,
}: {
  headerKey: string
  value: string
  onUpdate: (k: string, v: string) => void
  onRemove: () => void
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
      <input
        value={headerKey}
        onChange={(e) => onUpdate(e.target.value, value)}
        placeholder="Header name (e.g. api-version)"
        className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <input
        value={value}
        onChange={(e) => onUpdate(headerKey, e.target.value)}
        placeholder="Value"
        className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Provider form (shared by create + edit) ───────────────────────────────────

interface ProviderFormState {
  key: string
  name: string
  baseUrl: string
  apiKey: string
  api: LlmApiType
  isEnabled: boolean
  models: LlmModel[]
  headers: { k: string; v: string }[]
}

function ProviderForm({
  state,
  onChange,
  isEdit,
}: {
  state: ProviderFormState
  onChange: (s: ProviderFormState) => void
  isEdit?: boolean
}) {
  const set = <K extends keyof ProviderFormState>(key: K, value: ProviderFormState[K]) =>
    onChange({ ...state, [key]: value })

  function addModel() {
    onChange({ ...state, models: [...state.models, { id: '', name: '', maxTokens: 4096 }] })
  }

  function updateModel(i: number, m: LlmModel) {
    const models = [...state.models]
    models[i] = m
    onChange({ ...state, models })
  }

  function removeModel(i: number) {
    onChange({ ...state, models: state.models.filter((_, idx) => idx !== i) })
  }

  function addHeader() {
    onChange({ ...state, headers: [...state.headers, { k: '', v: '' }] })
  }

  function updateHeader(i: number, k: string, v: string) {
    const headers = [...state.headers]
    headers[i] = { k, v }
    onChange({ ...state, headers })
  }

  function removeHeader(i: number) {
    onChange({ ...state, headers: state.headers.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      {/* Name + Key */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Display Name</label>
          <input
            value={state.name}
            onChange={(e) => {
              const name = e.target.value
              onChange({ ...state, name, key: isEdit ? state.key : generateKey(name) })
            }}
            placeholder="e.g. Azure Anthropic"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Key (unique ID)</label>
          <input
            value={state.key}
            onChange={(e) => set('key', e.target.value)}
            placeholder="e.g. oc-01-anthropic"
            disabled={isEdit}
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/30',
              isEdit && 'opacity-50 cursor-not-allowed',
            )}
          />
        </div>
      </div>

      {/* Base URL + API type */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Base URL</label>
          <input
            value={state.baseUrl}
            onChange={(e) => set('baseUrl', e.target.value)}
            placeholder="https://api.anthropic.com"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">API Type</label>
          <Select value={state.api} onValueChange={(v) => set('api', v as LlmApiType)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anthropic-messages">Anthropic Messages</SelectItem>
              <SelectItem value="openai-completions">OpenAI Completions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* API Key */}
      <div className="space-y-1">
        <label className="text-xs font-medium">
          API Key{isEdit && <span className="ml-1 text-muted-foreground">(leave blank to keep existing)</span>}
        </label>
        <input
          type="password"
          value={state.apiKey}
          onChange={(e) => set('apiKey', e.target.value)}
          placeholder={isEdit ? '••••••••••••' : 'sk-...'}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Custom headers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Custom Headers</label>
          <button
            type="button"
            onClick={addHeader}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add header
          </button>
        </div>
        {state.headers.length > 0 && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-0.5">
              <span>Name</span><span>Value</span><span />
            </div>
            {state.headers.map((h, i) => (
              <HeaderRow
                key={i}
                headerKey={h.k}
                value={h.v}
                onUpdate={(k, v) => updateHeader(i, k, v)}
                onRemove={() => removeHeader(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Models */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Models</label>
          <button
            type="button"
            onClick={addModel}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add model
          </button>
        </div>
        {state.models.length > 0 && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 text-xs text-muted-foreground px-0.5">
              <span>Model ID</span><span>Display name</span><span>Max tokens</span><span />
            </div>
            {state.models.map((m, i) => (
              <ModelRow
                key={i}
                model={m}
                onUpdate={(m) => updateModel(i, m)}
                onRemove={() => removeModel(i)}
              />
            ))}
          </div>
        )}
        {state.models.length === 0 && (
          <p className="text-xs text-muted-foreground">No models added yet.</p>
        )}
      </div>

      {/* Enabled toggle */}
      <div className="flex items-center gap-2">
        <Switch checked={state.isEnabled} onCheckedChange={(v) => set('isEnabled', v)} />
        <span className="text-sm">Provider enabled</span>
      </div>
    </div>
  )
}

// ── Create dialog ─────────────────────────────────────────────────────────────

function CreateProviderDialog({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateLlmProviderDto) => void
  isPending: boolean
}) {
  const [form, setForm] = useState<ProviderFormState>({
    key: '',
    name: '',
    baseUrl: '',
    apiKey: '',
    api: 'openai-completions',
    isEnabled: true,
    models: [],
    headers: [],
  })

  function handleClose() {
    setForm({ key: '', name: '', baseUrl: '', apiKey: '', api: 'openai-completions', isEnabled: true, models: [], headers: [] })
    onClose()
  }

  function handleSubmit() {
    onSubmit({
      key: form.key,
      name: form.name,
      baseUrl: form.baseUrl,
      apiKey: form.apiKey,
      api: form.api,
      isEnabled: form.isEnabled,
      models: form.models,
      headers: Object.fromEntries(form.headers.filter((h) => h.k).map((h) => [h.k, h.v])),
    })
  }

  const isValid = form.key.trim() && form.name.trim() && form.baseUrl.trim() && form.apiKey.trim()

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add LLM Provider</DialogTitle>
          <DialogDescription>
            Configure a provider with its API endpoint, key, and models.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2 pr-1">
          <ProviderForm state={form} onChange={setForm} />
        </div>
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !isValid}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function EditProviderDialog({
  provider,
  onClose,
  onSubmit,
  isPending,
}: {
  provider: LlmProvider
  onClose: () => void
  onSubmit: (data: UpdateLlmProviderDto) => void
  isPending: boolean
}) {
  const [form, setForm] = useState<ProviderFormState>({
    key: provider.key,
    name: provider.name,
    baseUrl: provider.baseUrl,
    apiKey: '',
    api: provider.api,
    isEnabled: provider.isEnabled,
    models: provider.models,
    headers: Object.entries(provider.headers).map(([k, v]) => ({ k, v })),
  })

  function handleSubmit() {
    const data: UpdateLlmProviderDto = {
      name: form.name,
      baseUrl: form.baseUrl,
      api: form.api,
      isEnabled: form.isEnabled,
      models: form.models,
      headers: Object.fromEntries(form.headers.filter((h) => h.k).map((h) => [h.k, h.v])),
    }
    if (form.apiKey.trim()) data.apiKey = form.apiKey
    onSubmit(data)
  }

  const isValid = form.name.trim() && form.baseUrl.trim()

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Provider</DialogTitle>
          <DialogDescription>Key: <code className="font-mono text-xs">{provider.key}</code></DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2 pr-1">
          <ProviderForm state={form} onChange={setForm} isEdit />
        </div>
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !isValid}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Settings card ─────────────────────────────────────────────────────────────

function SettingsCard({ providers }: { providers: LlmProvider[] }) {
  const { data: settings, isLoading } = useLlmSettings()
  const updateSettings = useUpdateLlmSettings()

  if (isLoading || !settings) return null

  // Flat list of all models across all providers for the active model selector
  const allModels = providers.flatMap((p) =>
    p.models.map((m) => ({ providerKey: p.key, providerName: p.name, ...m })),
  )

  const activeLabel = (() => {
    if (!settings.activeProviderKey || !settings.activeModelId) return null
    const m = allModels.find(
      (m) => m.providerKey === settings.activeProviderKey && m.id === settings.activeModelId,
    )
    return m ? `${m.providerName} → ${m.name}` : `${settings.activeProviderKey} / ${settings.activeModelId}`
  })()

  const activeValue = settings.activeProviderKey && settings.activeModelId
    ? `${settings.activeProviderKey}::${settings.activeModelId}`
    : '__none__'

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Translation Review Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Enable toggle */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">LLM Review</p>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.isEnabled}
                onCheckedChange={(v) => updateSettings.mutate({ isEnabled: v })}
                disabled={updateSettings.isPending}
              />
              <span className="text-sm text-muted-foreground">
                {settings.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, every machine-translated locale is reviewed by the selected model before saving.
            </p>
          </div>

          {/* Active model */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Active Model</p>
            <Select
              value={activeValue}
              onValueChange={(v) => {
                if (v === '__none__') {
                  updateSettings.mutate({ activeProviderKey: null, activeModelId: null })
                } else {
                  const [providerKey, modelId] = v.split('::')
                  updateSettings.mutate({ activeProviderKey: providerKey, activeModelId: modelId })
                }
              }}
              disabled={updateSettings.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model…">
                  {activeLabel ?? 'Select a model…'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {providers
                  .filter((p) => p.isEnabled)
                  .map((p) =>
                    p.models.map((m) => (
                      <SelectItem key={`${p.key}::${m.id}`} value={`${p.key}::${m.id}`}>
                        <span className="text-muted-foreground mr-1">{p.name} →</span> {m.name}
                      </SelectItem>
                    )),
                  )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only models from enabled providers are shown.
            </p>
          </div>

          {/* Concurrency */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Concurrency</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={20}
                value={settings.concurrency}
                onChange={(e) => updateSettings.mutate({ concurrency: Number(e.target.value) })}
                className="w-20 rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <span className="text-sm text-muted-foreground">parallel locale reviews</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Max simultaneous LLM calls. Lower if hitting rate limits.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Expandable provider row ───────────────────────────────────────────────────

function ProviderRow({
  provider,
  onEdit,
  onDelete,
}: {
  provider: LlmProvider
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <TableRow>
        <TableCell>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 font-medium hover:text-primary transition-colors"
          >
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {provider.name}
          </button>
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">{provider.key}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {provider.api === 'anthropic-messages' ? 'Anthropic' : 'OpenAI'}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{provider.models.length}</TableCell>
        <TableCell>
          <Badge variant={provider.isEnabled ? 'default' : 'secondary'}>
            {provider.isEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expanded && provider.models.length > 0 && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={6} className="py-2 pl-10">
            <div className="space-y-1">
              {provider.models.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Cpu className="h-3 w-3 shrink-0" />
                  <code className="font-mono">{m.id}</code>
                  <span className="text-foreground/70">{m.name}</span>
                  <span className="ml-auto">{m.maxTokens.toLocaleString()} max tokens</span>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminLlmPage() {
  const { data: providers = [], isLoading } = useLlmProviders()
  const createMutation = useCreateLlmProvider()
  const updateMutation = useUpdateLlmProvider()
  const deleteMutation = useDeleteLlmProvider()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<LlmProvider | null>(null)
  const [deletingProvider, setDeletingProvider] = useState<LlmProvider | null>(null)

  async function handleCreate(data: CreateLlmProviderDto) {
    await createMutation.mutateAsync(data)
    setCreateOpen(false)
  }

  async function handleUpdate(data: UpdateLlmProviderDto) {
    if (!editingProvider) return
    await updateMutation.mutateAsync({ key: editingProvider.key, data })
    setEditingProvider(null)
  }

  async function handleDelete() {
    if (!deletingProvider) return
    await deleteMutation.mutateAsync(deletingProvider.key)
    setDeletingProvider(null)
  }

  return (
    <div className="py-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">LLM Providers</h1>
          <p className="text-sm text-muted-foreground">
            Configure AI providers and models used for translation review.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      <SettingsCard providers={providers} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            All Providers
            {providers.length > 0 && (
              <Badge variant="secondary" className="ml-2">{providers.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No providers configured yet.</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Provider
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>API Type</TableHead>
                    <TableHead>Models</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((p) => (
                    <ProviderRow
                      key={p.key}
                      provider={p}
                      onEdit={() => setEditingProvider(p)}
                      onDelete={() => setDeletingProvider(p)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateProviderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
      />

      {editingProvider && (
        <EditProviderDialog
          key={editingProvider.key}
          provider={editingProvider}
          onClose={() => setEditingProvider(null)}
          onSubmit={handleUpdate}
          isPending={updateMutation.isPending}
        />
      )}

      <Dialog open={!!deletingProvider} onOpenChange={(v) => !v && setDeletingProvider(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete provider?</DialogTitle>
            <DialogDescription>
              <strong>{deletingProvider?.name}</strong> and all its models will be removed.
              If this is the active review model, reviews will stop until a new model is selected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProvider(null)}>Cancel</Button>
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
