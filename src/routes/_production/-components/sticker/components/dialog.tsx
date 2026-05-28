import { type PropsWithChildren, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'

import { printCSS } from '../constants'
import type { StickerDefinition } from '../types'

import { StickerTemplate } from './stickers/sticker-template'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import type { ModalState } from '@/types/modal'

interface Props<T> extends Partial<ModalState>, PropsWithChildren {
  entity: T
  order: {
    invoice: string
    customer: string
  }
  definition: StickerDefinition<T>
}

export const PrintStickerDialog = <T,>({
  open: externalOpen,
  setOpen: externalSetOpen,
  entity,
  order,
  definition,
  children
}: Props<T>) => {
  const [internalOpen, setInternalOpen] = useState(false)

  const open = externalOpen ?? internalOpen
  const setOpen = externalSetOpen ?? setInternalOpen

  const contentRef = useRef<HTMLDivElement>(null)

  const print = useReactToPrint({
    contentRef,
    documentTitle: definition.getName(entity),
    pageStyle: printCSS
  })

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}

      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle className='text-base'>{definition.title}</DialogTitle>
        </DialogHeader>

        <StickerTemplate
          ref={contentRef}
          entity={entity}
          order={order}
          definition={definition}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button
              size='sm'
              variant='secondary'
              className='flex-1'
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={print}
            size='sm'
            className='flex-1'
          >
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
