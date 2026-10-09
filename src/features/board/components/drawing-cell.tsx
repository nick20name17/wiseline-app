import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useState } from 'react'
import type { ProductFile } from '../api'

type DrawingCellProps = {
  drawing: ProductFile | null
  /** What the drawing is of, for its label and the window's title. */
  product: string | null
}

/**
 * The profile the floor is bending, small enough to sit in a row and opened full size on a click —
 * the board's Drawing column p1 (660,539), (538,353).
 */
export const DrawingCell = ({ drawing, product }: DrawingCellProps) => {
  const [open, setOpen] = useState(false)
  if (!drawing?.url) return <span className='text-muted-foreground'>—</span>

  const label = `Drawing of ${product ?? drawing.name}`
  return (
    <>
      <Button variant='outline' size='icon-sm' aria-label={label} onClick={() => setOpen(true)}>
        <img src={drawing.url} alt='' className='size-full rounded-md object-contain' />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{drawing.name}</DialogDescription>
          </DialogHeader>
          <img src={drawing.url} alt={label} className='max-h-128 w-full object-contain' />
        </DialogContent>
      </Dialog>
    </>
  )
}
