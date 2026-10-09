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
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  remanufacturingsQuery,
  useRequestRemanufacture,
  type RemanufactureSource,
  type WrappingRow
} from '../api'
import { remakeRoom, remanOwed } from '../lib/wrapping'
import { KeypadDialog } from './keypad-dialog'

type RemanufactureDialogProps = {
  departmentId: number | undefined
  /** The line to remake part of, or `null` when the window is shut. */
  line: Pick<
    WrappingRow,
    'order' | 'origin_item' | 'order_number' | 'description' | 'qty_ordered'
  > | null
  source?: RemanufactureSource
  /** The machine the new bendlist lands on, when the caller knows it. */
  machineName?: string | null
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
  source = 'wrapping',
  machineName,
  onOpenChange
}: RemanufactureDialogProps) => {
  const [line, release] = useRetained(current)
  const { data: remans } = useQuery({ ...remanufacturingsQuery(departmentId), enabled: !!line })
  const [quantity, setQuantity] = useState('')
  const [fromStock, setFromStock] = useState('')
  const [note, setNote] = useState('')
  const [keying, setKeying] = useState(false)
  const [error, setError] = useState('')

  // Cleared once the popup is gone rather than on close, so the fields do not empty as it fades out.
  // Opening goes straight to the keypad: the figure is the one thing every remake needs (p1 (677,470)).
  const settle = (open: boolean) => {
    if (open) return setKeying(room > 0)
    setQuantity('')
    setFromStock('')
    setNote('')
    setError('')
    release(open)
  }

  const request = useRequestRemanufacture(() => onOpenChange(false))

  const ordered = line?.qty_ordered ?? 0
  // «Between 1 and the Qty Ordered», less what is already waiting to come back.
  const lineRemans = line ? (remans?.get(line.origin_item) ?? []) : []
  const awaiting = remanOwed(lineRemans)
  const room = remakeRoom(ordered, lineRemans)

  const submit = () => {
    if (!line || !departmentId) return
    const wanted = Number(quantity)
    if (!Number.isInteger(wanted) || wanted < 1 || wanted > room)
      return setError(`Remake between 1 and ${room}.`)
    const stock = fromStock.trim() ? Number(fromStock) : undefined
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0 || stock > ordered))
      return setError(`From stock takes 0 to the ${ordered} ordered.`)
    setError('')
    request.mutate(
      {
        source,
        order: line.order,
        origin_item: line.origin_item,
        department: departmentId,
        quantity: wanted,
        ...(stock === undefined ? {} : { pull_from_stock_qty: stock }),
        ...(note.trim() ? { note: note.trim() } : {})
      },
      {
        onSuccess: () =>
          toast.add({
            type: 'success',
            title: `Remanufacture ${wanted} pcs → recut cutlist on Slinet + new bendlist on ${machineName ?? 'its machine'}`
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
            {ordered} ordered. The remake gets its own cutlist and bendlist.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          <div className='flex items-center gap-3'>
            <Label className='w-40' htmlFor='reman-quantity'>
              Pieces to remake
            </Label>
            {/* p1 (677,470), (871,615): the figure is keyed in on the floor's keypad. */}
            <Button
              id='reman-quantity'
              variant='outline'
              className='w-24'
              aria-describedby='reman-quantity-hint'
              disabled={!room}
              onClick={() => setKeying(true)}
            >
              <span className='font-mono'>{quantity || '—'}</span>
            </Button>
            <span id='reman-quantity-hint' className='text-sm text-muted-foreground'>
              {room ? `1–${room}` : 'None left to remake'}
              {awaiting ? ` · ${awaiting} of ${ordered} already awaited` : ''}
            </span>
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
              max={ordered}
              inputMode='numeric'
              placeholder='0'
              aria-describedby='reman-stock-hint'
              value={fromStock}
              onChange={event => setFromStock(event.target.value)}
            />
            <span id='reman-stock-hint' className='text-sm text-muted-foreground'>
              0–{ordered}
            </span>
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
          <Button disabled={request.isPending || !room} onClick={submit}>
            {request.isPending ? <Spinner data-icon='inline-start' /> : null}
            Request remake
          </Button>
        </DialogFooter>
        <KeypadDialog
          target={
            // Opened before the line's remakes are known, it closes if they leave nothing to remake.
            keying && room
              ? { title: 'Pieces to remake', current: Number(quantity) || 0, max: room }
              : null
          }
          onOpenChange={setKeying}
          onEnter={value => {
            setQuantity(value ? String(value) : '')
            setKeying(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
