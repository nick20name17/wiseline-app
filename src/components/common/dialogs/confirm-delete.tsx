import { RiLoader2Fill } from '@remixicon/react'
import { type PropsWithChildren } from 'react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { ModalState } from '@/types/modal'

interface ConfirmDeleteDialogProps extends PropsWithChildren, ModalState {
  onDelete: () => void
  isPending: boolean
}

export const ConfirmDeleteDialog = ({
  children,
  onDelete,
  setOpen,
  open,
  isPending
}: ConfirmDeleteDialogProps) => {
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
    >
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='w-20'>Cancel</AlertDialogCancel>
          <Button
            disabled={isPending}
            onClick={onDelete}
            className='w-20'
            variant='destructive'
          >
            {isPending ? <RiLoader2Fill className='animate-spin' /> : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
