import type { Bindings, ImageWriteMessage } from './bindings'

export async function handleR2WriteQueue(
  batch: MessageBatch<ImageWriteMessage>,
  env: Bindings,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      const { r2Key, blobUrl, contentType } = msg.body
      const response = await fetch(blobUrl)
      if (!response.ok || !response.body) {
        console.error(`[r2-queue] fetch failed: ${response.status} for ${blobUrl}`)
        msg.retry()
        continue
      }
      await env.IMG_CACHE.put(r2Key, response.body, {
        httpMetadata: { contentType },
      })
      msg.ack()
    } catch (err) {
      console.error('[r2-queue] error:', err)
      msg.retry()
    }
  }
}
