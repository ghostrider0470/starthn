export const TARGET_WIDTHS = [400, 800, 1200, 1600, 2000] as const
export const TARGET_QUALITY = 0.82

export interface WebpVariant {
  width: number
  blob: Blob
}

interface WorkerSuccess {
  ok: true
  results: WebpVariant[]
}

interface WorkerFailure {
  ok: false
  error: string
}

/**
 * Convert an image file to a set of webp variants at the target widths.
 * Runs in a dedicated Web Worker with OffscreenCanvas to keep the UI thread
 * responsive during encoding.
 *
 * Throws on decoding failure, OOM, or unsupported source format. Callers
 * should catch and fall back to uploading the original untouched.
 */
export async function convertToWebpVariants(
  file: File,
  options: { widths?: readonly number[]; quality?: number } = {},
): Promise<WebpVariant[]> {
  const widths = options.widths ?? TARGET_WIDTHS
  const quality = options.quality ?? TARGET_QUALITY

  const bitmap = await createImageBitmap(file)

  const worker = new Worker(new URL('./image-convert.worker.ts', import.meta.url), {
    type: 'module',
  })

  try {
    const result = await new Promise<WorkerSuccess | WorkerFailure>((resolve, reject) => {
      worker.onmessage = (event) => resolve(event.data)
      worker.onerror = (err) => reject(err)
      worker.postMessage(
        { imageBitmap: bitmap, widths: Array.from(widths), quality },
        [bitmap],
      )
    })

    if (!result.ok) {
      throw new Error(`Image conversion failed: ${result.error}`)
    }
    return result.results
  } finally {
    worker.terminate()
  }
}
