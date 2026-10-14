import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/dialog'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { Trash2 } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useCreateStockOrder, useScanStockCard, type StockCardOption } from '../api'
import { pickedProduct } from '../lib/product-pick'
import { ProductPicker } from './product-picker'

// A box's label on a phone, where the line is a card and the header row above it is gone. Only for
// the eye: each box carries its own aria-label, row number included.
const FIELD_LABEL = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase md:hidden'

// `productId` is the text in the box and `product` the last pick; the line names a product only
// while the two agree. `described` marks a description typed by hand, which a pick must not overwrite.
type Row = {
  id: string
  qty: string
  productId: string
  product: StockCardOption | null
  description: string
  described: boolean
  length: string
}

const blank = (): Row => ({
  id: crypto.randomUUID(),
  qty: '',
  productId: '',
  product: null,
  description: '',
  described: false,
  length: ''
})

const isBlank = (row: Row) => !row.qty && !row.productId && !row.description && !row.length

const productOf = (row: Row) => pickedProduct(row.productId, row.product)

// A line always ends the grid empty, to type or scan into, and never two of them.
const withOneBlank = (rows: Row[]) => {
  const next = [...rows]
  while (next.length > 1 && isBlank(next.at(-1)!) && isBlank(next.at(-2)!)) next.pop()
  if (!isBlank(next.at(-1)!)) next.push(blank())
  return next
}

/**
 * A handheld QR scanner is a keyboard wedge: it types its payload in a burst and ends with Enter, so a
 * run of keystrokes under this far apart followed by Enter is a scan rather than somebody typing.
 */
const SCAN_GAP_MS = 50
const SCAN_MIN_LENGTH = 3

/** A Stock Card's QR, as the server prints it: `WLSC|<product ID>|<order qty>`. */
const readCard = (payload: string) => {
  const [prefix, productId, qty] = payload.split('|')
  return prefix === 'WLSC' && productId && qty && Number(qty) > 0 ? { productId, qty } : null
}

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
 * have to click anything with the other. A Product ID is picked from EBMS's Trim products, never
 * typed free: only Trim makes stock.
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
  // What the grid held before the keystroke that began the current burst, so a scan can take back
  // what the wedge typed into whichever box had focus.
  const rowsRef = useRef(rows)
  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const edit = (id: string, patch: Partial<Row>) => {
    // The message was about the grid as it was; an edit may have answered it, and Create says again.
    setError('')
    setRows(current =>
      // Typing into the last line is what grows the table.
      withOneBlank(
        current.map(row => {
          if (row.id !== id) return row
          const next = { ...row, ...patch }
          // Until one is typed, the description is the picked product's.
          return next.described
            ? next
            : { ...next, description: productOf(next)?.description ?? '' }
        })
      )
    )
  }

  const remove = (id: string) => {
    setError('')
    setRows(current => {
      const next = current.filter(row => row.id !== id)
      return next.length ? next : [blank()]
    })
  }

  const applyScan = useEffectEvent((payload: string, before: Row[]) => {
    // The burst landed in whichever box had focus; it goes, and so does the list it opened.
    setRows(before)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()

    const printed = readCard(payload)
    if (!printed) return toast.add({ type: 'error', title: 'That is not a Stock Card QR code' })

    // The server confirms the card still exists and names the product; the quantity is the one
    // printed on the card in hand.
    scanCard.mutate(payload, {
      onSuccess: card =>
        setRows(current => {
          const scanned: Row = {
            ...blank(),
            qty: printed.qty,
            productId: card.product_id,
            product: {
              product_id: card.product_id,
              description: card.description,
              color: null,
              gauge: null,
              has_card: true
            },
            description: card.description ?? ''
          }
          const last = current.at(-1)
          return withOneBlank(
            last && isBlank(last)
              ? [...current.slice(0, -1), { ...scanned, id: last.id }]
              : [...current, scanned]
          )
        }),
      onError: () =>
        toast.add({
          type: 'error',
          title: `No Stock Card for ${printed.productId} — pick the line`
        })
    })
  })

  // The wedge types into whatever field has focus, which is why the burst is taken back out of the
  // grid here rather than left in the row it landed in. Listened for in the capture phase, so the
  // closing Enter never reaches a Product ID list and picks whatever it had highlighted.
  useEffect(() => {
    if (!open) return

    let buffer = ''
    let lastKey = 0
    let before = rowsRef.current

    const onKeyDown = (event: KeyboardEvent) => {
      const now = Date.now()
      if (now - lastKey > SCAN_GAP_MS) {
        buffer = ''
        before = rowsRef.current
      }
      lastKey = now

      if (event.key === 'Enter') {
        const payload = buffer
        buffer = ''
        // The gap above already rules out human typing; this floor only excludes a stray keystroke.
        if (payload.length < SCAN_MIN_LENGTH) return
        event.preventDefault()
        event.stopPropagation()
        applyScan(payload, before)
        return
      }

      if (event.key.length === 1) buffer += event.key
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  const submit = () => {
    const filled = rows.filter(row => !isBlank(row))
    if (!filled.length) return setError('Add at least one line item.')
    if (filled.some(row => !row.productId.trim())) return setError('Every row needs a Product ID.')
    const unknown = filled.filter(row => !productOf(row)).map(row => row.productId.trim())
    if (unknown.length)
      return setError(
        `Pick each Product ID from the list — ${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} not a Trim product in EBMS.`
      )
    if (filled.some(row => !(Number(row.qty) >= 1)))
      return setError('Every row needs a quantity of 1 or more.')
    if (filled.some(row => row.length && !(Number(row.length) > 0)))
      return setError('A length has to be more than 0.')

    setError('')
    create.mutate(
      filled.map(row => ({
        product_id: productOf(row)!.product_id,
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
            would read as a table of records rather than as lines being written. A phone has no
            width for a line across, so each line is a small card with its labels on its boxes; the
            wrappers step out of the way (`contents`) from md up. The drawer scrolls as one there. */}
        <div className='scrollport space-y-2 md:max-h-80 md:overflow-y-auto'>
          <div className='flex items-center gap-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase max-md:hidden'>
            <span className='w-24'>Qty</span>
            <span className='w-44'>Product ID</span>
            <span className='flex-1'>Description</span>
            <span className='w-24'>Length (in.)</span>
            <span className='w-8' />
          </div>

          {rows.map((row, index) => (
            <div
              key={row.id}
              className='flex items-center gap-3 max-md:flex-wrap max-md:items-end max-md:gap-2 max-md:rounded-lg max-md:border max-md:border-border max-md:p-3'
            >
              <div className='flex flex-col gap-1 max-md:flex-1 md:contents'>
                <span aria-hidden className={FIELD_LABEL}>
                  Qty
                </span>
                <Input
                  className='w-24 max-md:w-full'
                  type='number'
                  min={1}
                  inputMode='numeric'
                  aria-label={`Quantity, row ${index + 1}`}
                  placeholder='0'
                  value={row.qty}
                  onChange={event => edit(row.id, { qty: event.target.value })}
                />
              </div>
              <div className='flex flex-col gap-1 max-md:order-1 max-md:basis-full md:contents'>
                <span aria-hidden className={FIELD_LABEL}>
                  Product ID
                </span>
                <ProductPicker
                  className='w-44 max-md:w-full'
                  label={`Product ID, row ${index + 1}`}
                  placeholder='Search…'
                  text={row.productId}
                  onTextChange={productId => edit(row.id, { productId })}
                  picked={row.product}
                  onPick={product =>
                    edit(row.id, product ? { product, productId: product.product_id } : { product })
                  }
                  invalid={!!error && !!row.productId.trim() && !productOf(row)}
                />
              </div>
              <div className='flex flex-col gap-1 max-md:order-1 max-md:basis-full md:contents'>
                <span aria-hidden className={FIELD_LABEL}>
                  Description
                </span>
                <Input
                  className='flex-1'
                  aria-label={`Description, row ${index + 1}`}
                  placeholder='The product’s own unless typed'
                  value={row.description}
                  onChange={event =>
                    edit(row.id, {
                      description: event.target.value,
                      described: !!event.target.value
                    })
                  }
                />
              </div>
              <div className='flex flex-col gap-1 max-md:flex-1 md:contents'>
                <span aria-hidden className={FIELD_LABEL}>
                  Length (in.)
                </span>
                <Input
                  className='w-24 max-md:w-full'
                  type='number'
                  min={1}
                  inputMode='decimal'
                  aria-label={`Length, row ${index + 1}`}
                  placeholder='120'
                  value={row.length}
                  onChange={event => edit(row.id, { length: event.target.value })}
                />
              </div>
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
                <span className='w-8 max-md:hidden' />
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
