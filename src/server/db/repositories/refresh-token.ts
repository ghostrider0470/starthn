import { eq, sql } from 'drizzle-orm'
import { type Database } from '../client'
import { refreshTokens } from '../schema'

export class RefreshTokenRepository {
  constructor(private db: Database) {}

  async create(userId: string, tokenHash: string, expiresAt: string) {
    const result = await this.db.insert(refreshTokens).values({ userId, tokenHash, expiresAt }).returning({ id: refreshTokens.id })
    return result[0].id
  }

  async findByHash(tokenHash: string) {
    const rows = await this.db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1)
    const row = rows[0]
    if (!row || new Date(row.expiresAt) <= new Date()) return null
    return row
  }

  async deleteByUser(userId: string) {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
  }

  async deleteExpired() {
    await this.db.delete(refreshTokens).where(sql`${refreshTokens.expiresAt} <= datetime('now')`)
  }
}
