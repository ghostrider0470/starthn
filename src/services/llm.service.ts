import api from './api'

export type LlmApiType = 'anthropic-messages' | 'openai-completions'

export interface LlmModel {
  id: string
  name: string
  api?: LlmApiType | null
  maxTokens: number
}

export interface LlmProvider {
  id: string
  key: string
  name: string
  baseUrl: string
  apiKeyMasked: string
  api: LlmApiType
  headers: Record<string, string>
  isEnabled: boolean
  models: LlmModel[]
  createdAt: string
  updatedAt: string
}

export interface LlmSettings {
  isEnabled: boolean
  activeProviderKey: string | null
  activeModelId: string | null
  concurrency: number
}

export interface CreateLlmProviderDto {
  key: string
  name: string
  baseUrl: string
  apiKey: string
  api: LlmApiType
  headers: Record<string, string>
  isEnabled: boolean
  models: Omit<LlmModel, 'id'> & { id: string }[]
}

export interface UpdateLlmProviderDto {
  name?: string
  baseUrl?: string
  apiKey?: string        // omit to keep existing key
  api?: LlmApiType
  headers?: Record<string, string>
  isEnabled?: boolean
  models?: LlmModel[]
}

export interface UpdateLlmSettingsDto {
  isEnabled?: boolean
  activeProviderKey?: string | null
  activeModelId?: string | null
  concurrency?: number
}

export const llmService = {
  fetchProviders: () =>
    api.get<LlmProvider[]>('/manage/llm/providers').then((r) => r.data),

  createProvider: (data: CreateLlmProviderDto) =>
    api.post<LlmProvider>('/manage/llm/providers', data).then((r) => r.data),

  updateProvider: (key: string, data: UpdateLlmProviderDto) =>
    api.put<LlmProvider>(`/manage/llm/providers/${key}`, data).then((r) => r.data),

  deleteProvider: (key: string) =>
    api.delete(`/manage/llm/providers/${key}`),

  fetchSettings: () =>
    api.get<LlmSettings>('/manage/llm/settings').then((r) => r.data),

  updateSettings: (data: UpdateLlmSettingsDto) =>
    api.put<LlmSettings>('/manage/llm/settings', data).then((r) => r.data),
}
