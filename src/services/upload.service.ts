import { convertToWebpVariants } from '@/lib/image-convert'
import api from './api'

const CONTAINER_WIDTHS = {
  'blog-images': [400, 800, 1200, 1600, 2000],
  'avatars': [48, 96, 192],
  'page-images': [400, 800, 1200, 1600, 2000],
} as const

type Container = keyof typeof CONTAINER_WIDTHS

export interface UploadResult {
  path: string
  url: string
}

export async function uploadImage(file: File, container: Container): Promise<UploadResult> {
  const widths = CONTAINER_WIDTHS[container]
  const variants = await convertToWebpVariants(file, { widths })

  const formData = new FormData()
  formData.append('container', container)
  for (const v of variants) {
    formData.append(`w${v.width}`, v.blob, `w${v.width}.webp`)
  }

  const res = await api.post<UploadResult>('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
