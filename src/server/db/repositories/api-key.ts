import { eq, and, sql } from 'drizzle-orm'
import { type Database } from '../client'
import { apiKeys } from '../schema'

export class ApiKeyRepository {
  constructor(private db: Database) {}

  async create(userId: string, name: string, keyHash: string, keyPrefix: string, keySuffix: string, expiresAt?: string) {
    const result = await this.db.insert(apiKeys).values({
      userId, name, keyHash, keyPrefix, keySuffix, expiresAt: expiresAt ?? null,
    }).returning({ id: apiKeys.id })
    return result[0].id
  }

  async listByUser(userId: string) {
    return this.db.select({
      id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix,
      keySuffix: apiKeys.keySuffix, expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt, createdAt: apiKeys.createdAt,
    }).from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(apiKeys.createdAt)
  }

  async findByHash(keyHash: string) {
    const rows = await this.db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1)
    return rows[0] ?? null
  }

  async delete(userId: string, keyId: string) {
    await this.db.delete(apiKeys).where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
  }

  async updateLastUsed(id: string) {
    await this.db.update(apiKeys).set({ lastUsedAt: sql`datetime('now')` }).where(eq(apiKeys.id, id))
  }
}
