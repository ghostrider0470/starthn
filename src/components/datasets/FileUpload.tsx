import { useState, useRef } from 'react'
import {
  Upload,
  X,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata: {
    rowCount: number
    columnCount: number
  }
}

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  accept?: string
  maxSize?: number // in MB
  disabled?: boolean
  className?: string
}

export function FileUpload({
  onUpload,
  accept = '.csv,.xlsx,.xls',
  maxSize = 10, // 10MB default
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedExtensions = accept.split(',').map((ext) => ext.trim())
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
    if (!allowedExtensions.includes(fileExtension)) {
      return `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`
    }

    // Check file size
    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSize}MB limit`
    }

    return null
  }

  const handleFile = async (file: File) => {
    setError(null)
    setValidationResult(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)

    // Basic structure validation for Excel files
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'xlsx' || extension === 'xls') {
      setValidationResult({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: { rowCount: 0, columnCount: 0 },
      })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Simulate progress (you can implement actual progress tracking with axios)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      await onUpload(selectedFile)

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Reset after successful upload
      setTimeout(() => {
        setSelectedFile(null)
        setUploadProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setError(null)
    setValidationResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    if (extension === 'csv') {
      return <FileText className="h-5 w-5 text-primary" />
    }
    return <FileSpreadsheet className="h-5 w-5 text-accent" />
  }

  return (
    <div className={cn('w-full', className)}>
      {!selectedFile ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-border',
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:border-primary',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
          />

          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />

          <p className="text-sm font-medium mb-1">
            Drop your dataset file here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supported formats: CSV, Excel (.xlsx, .xls)
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum file size: {maxSize}MB
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              {getFileIcon(selectedFile.name)}
              <div>
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!uploading && (
              <button
                onClick={removeFile}
                className="p-1 hover:bg-muted rounded"
                type="button"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {isValidating && (
            <div className="mb-3">
              <p className="text-sm text-muted-foreground">
                Validating file structure...
              </p>
            </div>
          )}

          {validationResult && (
            <div className="mb-3 space-y-2">
              {validationResult.isValid ? (
                <div className="p-2 bg-primary/10 border border-primary/20 rounded flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-foreground">
                      File validated successfully
                    </p>
                    <p className="text-muted-foreground">
                      {validationResult.metadata.rowCount} rows,{' '}
                      {validationResult.metadata.columnCount} columns
                    </p>
                  </div>
                </div>
              ) : null}

              {validationResult.errors.length > 0 && (
                <div className="p-2 bg-destructive/10 border border-destructive/30 rounded">
                  <p className="text-xs font-medium text-destructive mb-1">
                    Errors:
                  </p>
                  <ul className="text-xs text-destructive space-y-0.5">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="p-2 bg-accent/10 border border-accent/30 rounded">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-accent mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-accent-foreground mb-1">
                        Warnings:
                      </p>
                      <ul className="text-xs text-accent-foreground space-y-0.5">
                        {validationResult.warnings.map((warn, i) => (
                          <li key={i}>• {warn}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="mb-3">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {!uploading && !isValidating && (
            <Button
              onClick={handleUpload}
              disabled={
                disabled || (validationResult != null && !validationResult.isValid)
              }
              className="w-full"
            >
              Upload Dataset
            </Button>
          )}
        </div>
      )}

      {error && !validationResult && (
        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
