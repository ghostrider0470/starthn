import { eq, sql } from 'drizzle-orm'
import { parseJson, type Database } from '../client'
import { llmProviders, llmSettings } from '../schema'

export interface CreateLlmProviderInput {
  key: string
  name: string
  baseUrl: string
  apiKey: string
  api?: string
  headers?: Record<string, string>
  isEnabled?: boolean
  models?: { id: string; name: string; api?: string; maxTokens?: number }[]
}

export type UpdateLlmProviderInput = Partial<Omit<CreateLlmProviderInput, 'key'>>

export class LlmProviderRepository {
  constructor(private db: Database) {}

  async getAll() {
    const rows = await this.db.select().from(llmProviders).orderBy(llmProviders.name)
    return rows.map(r => this.toDto(r))
  }

  async create(input: CreateLlmProviderInput) {
    const id = crypto.randomUUID().replace(/-/g, '')
    const now = new Date().toISOString()

    await this.db.insert(llmProviders).values({
      id,
      key: input.key,
      name: input.name,
      api: input.api ?? 'openai',
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      headers: JSON.stringify(input.headers ?? {}),
      models: JSON.stringify(input.models ?? []),
      isActive: input.isEnabled !== false ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    })

    return this.getByKey(input.key)
  }

  async update(key: string, input: UpdateLlmProviderInput) {
    const existing = await this.db.select().from(llmProviders).where(eq(llmProviders.key, key)).limit(1)
    if (existing.length === 0) return null

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (input.name !== undefined) updates.name = input.name
    if (input.baseUrl !== undefined) updates.baseUrl = input.baseUrl
    if (input.apiKey !== undefined) updates.apiKey = input.apiKey
    if (input.api !== undefined) updates.api = input.api
    if (input.headers !== undefined) updates.headers = JSON.stringify(input.headers)
    if (input.models !== undefined) updates.models = JSON.stringify(input.models)
    if (input.isEnabled !== undefined) updates.isActive = input.isEnabled ? 1 : 0

    await this.db.update(llmProviders).set(updates).where(eq(llmProviders.key, key))
    return this.getByKey(key)
  }

  async delete(key: string): Promise<boolean> {
    const existing = await this.db.select().from(llmProviders).where(eq(llmProviders.key, key)).limit(1)
    if (existing.length === 0) return false
    await this.db.delete(llmProviders).where(eq(llmProviders.key, key))
    return true
  }

  async getByKey(key: string) {
    const rows = await this.db.select().from(llmProviders).where(eq(llmProviders.key, key)).limit(1)
    if (rows.length === 0) return null
    return this.toDto(rows[0])
  }

  private toDto(r: typeof llmProviders.$inferSelect) {
    return {
      id: r.id,
      key: r.key,
      name: r.name,
      api: r.api,
      baseUrl: r.baseUrl,
      apiKey: r.apiKey,
      apiKeyMasked: r.apiKey ? `${r.apiKey.slice(0, 4)}...${r.apiKey.slice(-4)}` : null,
      headers: parseJson(r.headers, {} as Record<string, string>),
      models: parseJson(r.models, [] as any[]),
      isEnabled: r.isActive === 1,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  }

  async getActiveForChat() {
    const settings = await this.db.select().from(llmSettings).where(eq(llmSettings.id, 'global')).limit(1)
    const s = settings[0]
    if (!s?.chatProviderKey) return null
    const provider = await this.getByKey(s.chatProviderKey)
    if (!provider) return null
    const model = provider.models.find((m: any) => m.id === s.chatModelId)
    return { provider, model }
  }
}
