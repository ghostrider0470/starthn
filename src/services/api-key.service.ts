import api from './api'

export interface ApiKeyResponse {
  id: string
  name: string
  keyMasked: string
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

export interface CreateApiKeyResponse {
  id: string
  name: string
  key: string
  expiresAt: string | null
  createdAt: string
}

export interface CreateApiKeyDto {
  name: string
  expiresInDays: number | null
}

class ApiKeyService {
  async list(): Promise<ApiKeyResponse[]> {
    const response = await api.get('/user/api-keys')
    return response.data
  }

  async create(data: CreateApiKeyDto): Promise<CreateApiKeyResponse> {
    const response = await api.post('/user/api-keys', data)
    return response.data
  }

  async revoke(keyId: string): Promise<void> {
    await api.delete(`/user/api-keys/${keyId}`)
  }
}

export default new ApiKeyService()
