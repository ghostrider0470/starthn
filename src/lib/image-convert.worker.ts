/// <reference lib="webworker" />

interface WorkerRequest {
  imageBitmap: ImageBitmap
  widths: number[]
  quality: number
}

interface WorkerResponse {
  width: number
  blob: Blob
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { imageBitmap, widths, quality } = event.data
  try {
    const results: WorkerResponse[] = []
    for (const width of widths) {
      const height = Math.round(imageBitmap.height * (width / imageBitmap.width))
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('OffscreenCanvas 2d context unavailable')
      ctx.drawImage(imageBitmap, 0, 0, width, height)
      const blob = await canvas.convertToBlob({
        type: 'image/webp',
        quality,
      })
      results.push({ width, blob })
    }
    imageBitmap.close()
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage({
      ok: true,
      results,
    })
  } catch (err) {
    imageBitmap.close()
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage({
      ok: false,
      error: (err as Error).message,
    })
  }
}
