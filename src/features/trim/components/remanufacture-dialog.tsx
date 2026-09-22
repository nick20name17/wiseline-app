import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { useRetained } from '@/lib/use-retained'
import { useState } from 'react'
import { useRequestRemanufacture, type WrappingRow } from '../api'

type RemanufactureDialogProps = {
  departmentId: number | undefined
  /** The line to remake part of, or `null` when the window is shut. */
  line: WrappingRow | null
  onOpenChange: (open: boolean) => void
}

/**
 * Ask for part of a line item to be remade — a piece damaged at the bench, most often. The request
 * spins off its own cutlist and bendlist carrying only this quantity, so it travels the machines
 * again on its own rather than reopening the order.
 */
export const RemanufactureDialog = ({
  departmentId,
  line: current,
  onOpenChange
}: RemanufactureDialogProps) => {
  const [line, release] = useRetained(current)
  const [quantity, setQuantity] = useState('')
  const [fromStock, setFromStock] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  // Cleared once the popup is gone rather than on close, so the fields do not empty as it fades out.
  const settle = (open: boolean) => {
    if (open) return
    setQuantity('')
    setFromStock('')
    setNote('')
    setError('')
    release(open)
  }

  const request = useRequestRemanufacture(() => {
    toast.add({ type: 'success', title: 'Remanufacture requested' })
    onOpenChange(false)
  })

  const submit = () => {
    if (!line || !departmentId) return
    const wanted = Number(quantity)
    if (!(wanted > 0) || wanted > line.qty_ordered)
      return setError(`Remake between 1 and the ${line.qty_ordered} ordered.`)
    setError('')
    request.mutate(
      {
        order: line.order,
        origin_item: line.origin_item,
        department: departmentId,
        quantity: wanted,
        ...(fromStock.trim() ? { pull_from_stock_qty: Number(fromStock) } : {}),
        ...(note.trim() ? { note: note.trim() } : {})
      },
      {
        onError: requestError =>
          toast.add({
            type: 'error',
            title: 'Nothing was requested',
            description: requestError.message
          })
      }
    )
  }

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={settle}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Remanufacture</DialogTitle>
          <DialogDescription>
            {line?.description ?? 'This line'} on order {line?.order_number ?? line?.order} —{' '}
            {line?.qty_ordered ?? 0} ordered. The remake gets its own cutlist and bendlist.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          <div className='flex items-center gap-3'>
            <Label className='w-40' htmlFor='reman-quantity'>
              Pieces to remake
            </Label>
            <Input
              id='reman-quantity'
              placeholder='1'
              className='w-24'
              type='number'
              min={1}
              max={line?.qty_ordered}
              inputMode='numeric'
              value={quantity}
              onChange={event => setQuantity(event.target.value)}
            />
          </div>

          <div className='flex items-center gap-3'>
            <Label className='w-40' htmlFor='reman-stock'>
              Of those, from stock
            </Label>
            {/* The board lets the Stock figure be changed with the request, from zero up to the
                quantity ordered. */}
            <Input
              id='reman-stock'
              className='w-24'
              type='number'
              min={0}
              inputMode='numeric'
              placeholder='0'
              value={fromStock}
              onChange={event => setFromStock(event.target.value)}
            />
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='reman-note'>Note</Label>
            <Textarea
              id='reman-note'
              rows={2}
              placeholder='What happened to it'
              value={note}
              onChange={event => setNote(event.target.value)}
            />
          </div>
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={request.isPending} onClick={submit}>
            {request.isPending ? <Spinner data-icon='inline-start' /> : null}
            Request remake
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
