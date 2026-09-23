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
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { stockCardsQuery, useCreateStockOrder, useScanStockCard } from '../api'

// `described` marks a description typed by hand, which a later Product ID must not overwrite.
type Row = {
  id: string
  qty: string
  productId: string
  description: string
  described: boolean
  length: string
}

const blank = (): Row => ({
  id: crypto.randomUUID(),
  qty: '',
  productId: '',
  description: '',
  described: false,
  length: ''
})

const isBlank = (row: Row) => !row.qty && !row.productId && !row.description && !row.length

/**
 * A handheld QR scanner is a keyboard wedge: it types its payload in a burst and ends with Enter, so a
 * run of keystrokes under this far apart followed by Enter is a scan rather than somebody typing.
 */
const SCAN_GAP_MS = 50
const SCAN_MIN_LENGTH = 3

type StockOrderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Create Stock Order: an order the shop raises on itself. It lands in Unscheduled and goes through
 * every tab after it exactly like a customer's order — it simply has no EBMS row behind it, so it
 * carries no ship date and no order note, and its customer reads «Stock».
 *
 * There is no «Add row» and no «Scan» button. Typing into the last line spawns the next one, and the
 * scanner is live the whole time the dialog is open: somebody holding a scanner in one hand should not
 * have to click anything with the other.
 */
export const StockOrderDialog = ({ open, onOpenChange }: StockOrderDialogProps) => {
  const [rows, setRows] = useState<Row[]>(() => [blank()])
  const [error, setError] = useState('')

  const create = useCreateStockOrder(order => {
    toast.add({ type: 'success', title: `Stock order ${order} created` })
    setRows([blank()])
    onOpenChange(false)
  })
  const scanCard = useScanStockCard()
  // The only catalogue the API offers is the stock cards, so a typed Product ID fills its description
  // from the card that carries it.
  const { data: cards } = useQuery({ ...stockCardsQuery, enabled: open })
  const describe = (productId: string) =>
    cards?.find(card => card.product_id.toUpperCase() === productId.trim().toUpperCase())
      ?.description ?? ''

  const edit = (id: string, patch: Partial<Row>) =>
    setRows(current => {
      const next = current.map(row =>
        row.id !== id
          ? row
          : {
              ...row,
              ...patch,
              ...(patch.productId === undefined || row.described
                ? {}
                : { description: describe(patch.productId) })
            }
      )
      // Typing into the last line is what grows the table.
      if (next[next.length - 1] && !isBlank(next[next.length - 1]!)) next.push(blank())
      return next
    })

  const remove = (id: string) =>
    setRows(current => {
      const next = current.filter(row => row.id !== id)
      return next.length ? next : [blank()]
    })

  const applyScan = (payload: string) =>
    scanCard.mutate(payload, {
      onSuccess: card =>
        setRows(current => {
          const scanned: Row = {
            id: crypto.randomUUID(),
            qty: card.order_qty === null ? '' : String(card.order_qty),
            productId: card.product_id,
            description: card.description ?? '',
            described: false,
            length: ''
          }
          const at = current.findIndex(isBlank)
          const next =
            at >= 0
              ? current.map((row, index) => (index === at ? { ...scanned, id: row.id } : row))
              : [...current, scanned]

          // A scan into the middle can leave two blanks at the end; keep exactly one to type into.
          while (
            next.length > 1 &&
            isBlank(next[next.length - 1]!) &&
            isBlank(next[next.length - 2]!)
          )
            next.pop()
          if (!next.some(isBlank)) next.push(blank())
          return next
        }),
      onError: () => toast.add({ type: 'error', title: 'Unrecognised Stock Card — type the line' })
    })

  // The wedge types into whatever field has focus, which is why the burst is swallowed here rather
  // than left in the row it landed in.
  useEffect(() => {
    if (!open) return

    let buffer = ''
    let lastKey = 0

    const onKeyDown = (event: KeyboardEvent) => {
      const now = Date.now()
      if (now - lastKey > SCAN_GAP_MS) buffer = ''
      lastKey = now

      if (event.key === 'Enter') {
        const payload = buffer
        buffer = ''
        // The gap above already rules out human typing; this floor only excludes a stray keystroke.
        if (payload.length < SCAN_MIN_LENGTH) return
        event.preventDefault()
        applyScan(payload)
        return
      }

      if (event.key.length === 1) buffer += event.key
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = () => {
    const filled = rows.filter(row => !isBlank(row))
    if (!filled.length) return setError('Add at least one line item.')
    if (filled.some(row => !row.productId.trim())) return setError('Every row needs a Product ID.')
    if (filled.some(row => !(Number(row.qty) >= 1)))
      return setError('Every row needs a quantity of 1 or more.')
    if (filled.some(row => row.length && !(Number(row.length) > 0)))
      return setError('A length has to be more than 0.')

    setError('')
    create.mutate(
      filled.map(row => ({
        product_id: row.productId.trim(),
        quantity: Number(row.qty),
        // Left out, the line takes the product's own from EBMS.
        ...(row.description.trim() ? { description: row.description.trim() } : {}),
        ...(row.length ? { length: Number(row.length) } : {})
      }))
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Create stock order</DialogTitle>
          <DialogDescription>
            Internal order — no EBMS source, no ship date or order notes.
          </DialogDescription>
        </DialogHeader>

        {/* Labels over the boxes, not a table head: the grid is a form, and a banded header row
            would read as a table of records rather than as lines being written. */}
        <div className='scrollport max-h-80 space-y-2 overflow-y-auto'>
          <div className='flex items-center gap-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
            <span className='w-24'>Qty</span>
            <span className='w-44'>Product ID</span>
            <span className='flex-1'>Description</span>
            <span className='w-24'>Length (in.)</span>
            <span className='w-8' />
          </div>

          {rows.map((row, index) => (
            <div key={row.id} className='flex items-center gap-3'>
              <Input
                className='w-24'
                type='number'
                min={1}
                inputMode='numeric'
                aria-label={`Quantity, row ${index + 1}`}
                placeholder='0'
                value={row.qty}
                onChange={event => edit(row.id, { qty: event.target.value })}
              />
              <Input
                className='w-44'
                aria-label={`Product ID, row ${index + 1}`}
                placeholder='TSWB262'
                value={row.productId}
                onChange={event => edit(row.id, { productId: event.target.value })}
              />
              <Input
                className='flex-1'
                aria-label={`Description, row ${index + 1}`}
                placeholder='From EBMS unless typed'
                value={row.description}
                onChange={event =>
                  edit(row.id, { description: event.target.value, described: !!event.target.value })
                }
              />
              <Input
                className='w-24'
                type='number'
                min={1}
                inputMode='decimal'
                aria-label={`Length, row ${index + 1}`}
                placeholder='120'
                value={row.length}
                onChange={event => edit(row.id, { length: event.target.value })}
              />
              {/* The trailing blank row is the grow-row — there is nothing to delete there. */}
              {index < rows.length - 1 ? (
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-label={`Remove row ${index + 1}`}
                  onClick={() => remove(row.id)}
                >
                  <Trash2 />
                </Button>
              ) : (
                <span className='w-8' />
              )}
            </div>
          ))}
        </div>

        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <span
            aria-hidden
            className={
              scanCard.isPending
                ? 'size-1.5 rounded-full bg-primary'
                : 'size-1.5 rounded-full bg-success'
            }
          />
          Scanner live — scan a Stock Card QR any time to fill the next empty line.
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <DialogFooter>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={create.isPending} onClick={submit}>
            {create.isPending ? <Spinner data-icon='inline-start' /> : null}
            Create order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
