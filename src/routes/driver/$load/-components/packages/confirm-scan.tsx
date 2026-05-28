import { RiCamera2Fill } from '@remixicon/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { filesService } from '@/api/files/service'
import { LOADS_QUERY_KEYS } from '@/api/loads/query'
import type { Package } from '@/api/packages/schema'
import type { Skids } from '@/api/skids/schema'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/dropzone'
import { cn } from '@/lib/utils'

interface ConfifrmScanDialogProps {
  pack: Package | Skids
}

export const ConfirmScanDialog = ({ pack }: ConfifrmScanDialogProps) => {
  const isPackage = 'package_items' in pack

  const initialFile = pack.files?.[0]?.full_path

  const [files, setFiles] = useState<File[] | undefined>(initialFile ? [] : undefined)

  const [filePreview, setFilePreview] = useState<string | undefined>(() => initialFile)

  const handleDrop = (files: File[]) => {
    setFiles(files)
    if (files.length > 0) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          setFilePreview(e.target?.result)
        }
      }
      reader.readAsDataURL(files[0])
    }
  }

  const createFileMutation = useMutation({
    mutationFn: (payload: FormData) =>
      filesService.create(payload, {
        model_id: pack.id,
        model_name: isPackage ? 'Package' : 'Skid'
      }),
    onSuccess: (_, __, ___, { client }) => {
      toast.success('File uploaded successfully')
      client.invalidateQueries({ queryKey: LOADS_QUERY_KEYS.detail(pack.load?.id ?? -1) })
    }
  })

  const deleteFileMutation = useMutation({
    mutationFn: (id: number) => filesService.delete(id)
  })

  const handleImageUpload = () => {
    if (!files?.length) {
      toast.error('Please select an image first')
      return
    }

    const formData = new FormData()
    formData.append('file', files[0])

    pack.files.forEach((file) => deleteFileMutation.mutate(file.id))

    createFileMutation.mutate(formData)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className={cn(initialFile ? 'text-success border-success' : null)}
          variant='outline'
          size='icon-sm'
        >
          <RiCamera2Fill />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Upload image</AlertDialogTitle>
        </AlertDialogHeader>

        <Dropzone
          className='aspect-square size-full'
          accept={{ 'image/*': [] }}
          maxSize={1024 * 1024 * 10}
          onDrop={handleDrop}
          onError={(e) => toast.error(e.message)}
          src={files}
        >
          <DropzoneEmptyState />
          <DropzoneContent>
            {filePreview && (
              <div className='size-full'>
                <img
                  alt='Preview'
                  className='absolute top-0 left-0 size-full object-cover'
                  src={filePreview}
                />
              </div>
            )}
          </DropzoneContent>
        </Dropzone>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleImageUpload}
            disabled={!files?.length || createFileMutation.isPending}
          >
            Upload
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
