import api from '@/services/api'

export interface BlobFile {
  id: string
  fileName: string
  blobUrl: string
  contentType: string
  size: number
  uploadedAt: string
  uploadedBy?: string
  metadata?: string
}

export interface UserDataset {
  id: string
  title: string
  description?: string
  type: string
  status: string
  createdAt: string
  completedAt?: string
  datasetFileUrl?: string
  reportPdfUrl?: string
  rowCount: number
  validRowCount: number
  hasReport: boolean
  reportBlobFile?: {
    id: string
    fileName: string
    blobUrl: string
    uploadedAt: string
    size: number
  }
  datasetFile?: {
    id: string
    fileName: string
    size: number
    uploadedAt: string
  }
}

export interface UploadResponse {
  id: string
  fileName: string
  blobUrl: string
  contentType: string
  size: number
  uploadedAt: string
}

export const blobService = {
  // Upload a dataset file (CSV or Excel)
  uploadDataset: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<UploadResponse>('/blobfiles/upload-dataset', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  },

  // Get list of dataset files for current user
  listDatasets: async (): Promise<BlobFile[]> => {
    const response = await api.get<BlobFile[]>('/blobfiles/datasets')
    return response.data
  },

  // Legacy methods for backwards compatibility
  uploadReport: async (file: File): Promise<UploadResponse> => {
    return blobService.uploadDataset(file)
  },

  listReports: async (): Promise<BlobFile[]> => {
    return blobService.listDatasets()
  },

  // Download a file
  downloadFile: async (id: string): Promise<Blob> => {
    const response = await api.get(`/blobfiles/${id}`, {
      responseType: 'blob',
    })
    return response.data
  },

  // Delete a file
  deleteFile: async (id: string): Promise<void> => {
    await api.delete(`/blobfiles/${id}`)
  },


  // Get user datasets with report information
  getUserDatasets: async (): Promise<UserDataset[]> => {
    const response = await api.get<UserDataset[]>('/user/datasets')
    return response.data
  },

  // Download report for a dataset through backend
  downloadDatasetReport: async (datasetId: string): Promise<void> => {
    const response = await api.get(`/blobfiles/datasets/${datasetId}/report`, {
      responseType: 'blob',
    })
    
    // Create blob URL and trigger download
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    
    // Extract filename from Content-Disposition header if available
    const contentDisposition = response.headers.get('content-disposition')
    let fileName = `report_${datasetId}.pdf`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/)
      if (match) fileName = match[1]
    }
    
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  // Delete a dataset and all associated files
  deleteDataset: async (datasetId: string): Promise<void> => {
    await api.delete(`/blobfiles/datasets/${datasetId}`)
  },
}