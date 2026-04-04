import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  Eye,
  MoreVertical,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileUpload } from './FileUpload'
import { HelpResources } from './HelpResources'
import {
  blobService,
  type BlobFile,
  type UserDataset,
} from '@/services/blobService'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export function DatasetsManager() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch datasets with report information
  const {
    data: datasets,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-datasets'],
    queryFn: blobService.getUserDatasets,
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: blobService.uploadDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-datasets'] })
      setUploadDialogOpen(false)
      toast({
        title: 'Success',
        description: 'Dataset uploaded successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload dataset',
        variant: 'destructive',
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: blobService.deleteDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-datasets'] })
      setDeleteConfirmId(null)
      toast({
        title: 'Success',
        description: 'Dataset deleted successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description:
          error instanceof Error ? error.message : 'Failed to delete dataset',
        variant: 'destructive',
      })
    },
  })

  const handleDownloadDataset = async (dataset: UserDataset) => {
    if (!dataset.datasetFile) return

    try {
      const response = await blobService.downloadFile(dataset.datasetFile.id)
      const url = URL.createObjectURL(response)
      const link = document.createElement('a')
      link.href = url
      link.download = dataset.datasetFile.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast({
        title: 'Success',
        description: 'Download started',
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Failed to download dataset',
        variant: 'destructive',
      })
    }
  }

  const handleDownloadReport = async (dataset: UserDataset) => {
    try {
      await blobService.downloadDatasetReport(dataset.id)
      toast({
        title: 'Success',
        description: 'Download started',
      })
    } catch (error) {
      console.error('Report download error:', error)
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Failed to download report',
        variant: 'destructive',
      })
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    if (extension === 'csv') {
      return <FileText className="h-4 w-4 text-primary" />
    }
    return <FileSpreadsheet className="h-4 w-4 text-accent" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-destructive">
            Failed to load datasets. Please try again.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="flex gap-6">
        <div className="flex-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assessment Datasets</CardTitle>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Dataset
              </Button>
            </CardHeader>
            <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading datasets...</p>
            </div>
          ) : datasets && datasets.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Report</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {dataset.datasetFile &&
                            getFileIcon(dataset.datasetFile.fileName)}
                          <div>
                            <span className="font-medium">
                              {dataset.title || 'Untitled Dataset'}
                            </span>
                            {dataset.datasetFile && (
                              <p className="text-sm text-muted-foreground">
                                {dataset.datasetFile.fileName}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            dataset.status === 'Completed'
                              ? 'success'
                              : dataset.status === 'Failed'
                                ? 'destructive'
                                : dataset.status === 'BeingProcessed'
                                  ? 'warning'
                                  : 'secondary'
                          }
                        >
                          {dataset.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dataset.validRowCount}/{dataset.rowCount}
                      </TableCell>
                      <TableCell>
                        {dataset.hasReport ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReport(dataset)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground/70">
                            No report
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(dataset.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {dataset.datasetFile && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleDownloadDataset(dataset)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Dataset
                                </DropdownMenuItem>
                              </>
                            )}
                            {dataset.hasReport && (
                              <DropdownMenuItem
                                onClick={() => handleDownloadReport(dataset)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Download Report
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmId(dataset.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No datasets uploaded yet</p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                Upload Your First Dataset
              </Button>
            </div>
          )}
            </CardContent>
          </Card>
        </div>
        
        {/* Help Resources Sidebar */}
        <div className="hidden lg:block">
          <HelpResources />
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Assessment Dataset</DialogTitle>
            <DialogDescription>
              Upload your datasets in CSV or Excel format.
            </DialogDescription>
          </DialogHeader>
          <FileUpload
            onUpload={async (file) => {
              await uploadMutation.mutateAsync(file)
            }}
            disabled={uploadMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dataset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dataset? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmId && deleteMutation.mutate(deleteConfirmId)
              }
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
