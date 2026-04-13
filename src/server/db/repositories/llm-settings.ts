import { eq, sql } from 'drizzle-orm'
import { type Database } from '../client'
import { llmSettings } from '../schema'

export class LlmSettingsRepository {
  constructor(private db: Database) {}

  async get() {
    const rows = await this.db.select().from(llmSettings).where(eq(llmSettings.id, 'global')).limit(1)
    return rows[0] ?? null
  }

  async upsert(settings: {
    chatProviderKey?: string; chatModelId?: string;
    reviewProviderKey?: string; reviewModelId?: string;
    translationProviderKey?: string; translationModelId?: string;
  }) {
    await this.db.insert(llmSettings).values({
      id: 'global',
      chatProviderKey: settings.chatProviderKey ?? null,
      chatModelId: settings.chatModelId ?? null,
      reviewProviderKey: settings.reviewProviderKey ?? null,
      reviewModelId: settings.reviewModelId ?? null,
      translationProviderKey: settings.translationProviderKey ?? null,
      translationModelId: settings.translationModelId ?? null,
    }).onConflictDoUpdate({
      target: llmSettings.id,
      set: {
        chatProviderKey: sql`excluded.chat_provider_key`,
        chatModelId: sql`excluded.chat_model_id`,
        reviewProviderKey: sql`excluded.review_provider_key`,
        reviewModelId: sql`excluded.review_model_id`,
        translationProviderKey: sql`excluded.translation_provider_key`,
        translationModelId: sql`excluded.translation_model_id`,
        updatedAt: sql`datetime('now')`,
      },
    })
  }
}
