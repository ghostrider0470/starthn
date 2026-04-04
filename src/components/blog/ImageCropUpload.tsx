import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { getCroppedImg, readFileAsDataUrl } from '@/utils/imageUtils'
import blogService from '@/services/blog.service'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  ImagePlus,
  X,
  Loader2,
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  ZoomIn,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ImageCropUploadProps {
  aspectRatio: number
  label: string
  hint?: string
  value: string | null
  onChange: (url: string | null) => void
  previewHeight?: string
  /** Custom upload function. Defaults to blogService.uploadImage. */
  onUpload?: (file: File) => Promise<{ url: string }>
  /** Use circular crop mask (for avatars). */
  cropShape?: 'rect' | 'round'
}

export function ImageCropUpload({
  aspectRatio,
  label,
  hint,
  value,
  onChange,
  previewHeight = 'h-48',
  onUpload,
  cropShape = 'rect',
}: ImageCropUploadProps) {
  const { t } = useTranslation('pages')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Crop dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)

  // Drag state
  const [dragOver, setDragOver] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  function resetCropState() {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setCroppedAreaPixels(null)
  }

  async function openWithFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('admin.imageCrop.toast.invalidFile'),
        description: t('admin.imageCrop.toast.invalidFileDesc'),
        variant: 'destructive',
      })
      return
    }

    const dataUrl = await readFileAsDataUrl(file)
    setImageSrc(dataUrl)
    resetCropState()
    setDialogOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) openWithFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) openWithFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  async function handleApply() {
    if (!imageSrc || !croppedAreaPixels) return

    setUploading(true)
    try {
      const blob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        flipH,
        flipV,
      )
      const file = new File([blob], 'cropped-image.webp', {
        type: 'image/webp',
      })
      const uploadFn = onUpload ?? blogService.uploadImage
      const { url } = await uploadFn(file)
      onChange(url)
      setDialogOpen(false)
      toast({ title: t('admin.imageCrop.toast.uploaded'), description: t('admin.imageCrop.toast.uploadedDesc', { label }) })
    } catch {
      toast({
        title: t('admin.imageCrop.toast.uploadFailed'),
        description: t('admin.imageCrop.toast.uploadFailedDesc'),
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-medium">{label}</label>
          {hint && (
            <span className="text-xs text-muted-foreground">{hint}</span>
          )}
        </div>

        {value ? (
          <div className={cn('relative overflow-hidden rounded-xl', previewHeight)}>
            <img
              src={value}
              alt={label}
              className="h-full w-full object-cover"
            />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md bg-background/80 backdrop-blur-sm px-2 py-1 text-xs font-medium shadow-sm border hover:bg-background transition-colors"
              >
                {t('admin.imageCrop.replace')}
              </button>
              <button
                onClick={() => onChange(null)}
                className="rounded-md bg-background/80 backdrop-blur-sm p-1 shadow-sm border hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-sm text-muted-foreground transition-colors cursor-pointer',
              dragOver
                ? 'border-primary bg-primary/5 text-foreground'
                : 'hover:border-primary/40 hover:text-foreground',
            )}
          >
            <ImagePlus className="h-5 w-5" />
            {t('admin.imageCrop.dropText')}
          </button>
        )}
      </div>

      {/* ── Crop Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.imageCrop.cropTitle', { label })}</DialogTitle>
          </DialogHeader>

          {imageSrc && (
            <div className="space-y-4">
              {/* Cropper area */}
              <div className="relative h-72 sm:h-80 overflow-hidden rounded-lg bg-muted">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspectRatio}
                  cropShape={cropShape}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                  style={{
                    containerStyle: { borderRadius: '0.5rem' },
                  }}
                />
              </div>

              {/* Controls */}
              <div className="space-y-3">
                {/* Zoom */}
                <div className="flex items-center gap-3">
                  <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[zoom]}
                    onValueChange={([v]) => setZoom(v)}
                    min={1}
                    max={3}
                    step={0.01}
                    className="flex-1"
                  />
                  <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                    {zoom.toFixed(1)}x
                  </span>
                </div>

                {/* Rotation */}
                <div className="flex items-center gap-3">
                  <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[rotation]}
                    onValueChange={([v]) => setRotation(v)}
                    min={0}
                    max={360}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                    {rotation}°
                  </span>
                </div>

                {/* Transform buttons */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((r) => (r + 270) % 360)}
                    title={t('admin.imageCrop.rotateLeft')}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    title={t('admin.imageCrop.rotateRight')}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </Button>

                  <div className="mx-1 h-5 w-px bg-border" />

                  <Button
                    variant={flipH ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFlipH((f) => !f)}
                    title={t('admin.imageCrop.flipHorizontal')}
                  >
                    <FlipHorizontal2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={flipV ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFlipV((f) => !f)}
                    title={t('admin.imageCrop.flipVertical')}
                  >
                    <FlipVertical2 className="h-3.5 w-3.5" />
                  </Button>

                  <div className="mx-1 h-5 w-px bg-border" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetCropState}
                    title={t('admin.imageCrop.reset')}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    {t('admin.imageCrop.reset')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={uploading}
            >
              {t('admin.imageCrop.cancel')}
            </Button>
            <Button onClick={handleApply} disabled={uploading || !croppedAreaPixels}>
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {uploading ? t('admin.imageCrop.uploading') : t('admin.imageCrop.apply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
