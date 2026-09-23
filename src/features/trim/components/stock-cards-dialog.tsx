import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { toggled } from '@/lib/sets'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Printer, QrCode, Search, SearchX, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  stockCardsQuery,
  useCreateStockOrder,
  useDeleteStockCard,
  usePrintStockCards,
  type StockCard
} from '../api'
import { ConfirmDialog } from './confirm-dialog'
import { StockCardDialog } from './stock-card-dialog'

type CardOrderFormProps = {
  card: StockCard
  onClose: () => void
}

/** The window's body, mounted with the popup so every opening starts from the card as it stands. */
const CardOrderForm = ({ card, onClose }: CardOrderFormProps) => {
  const [qty, setQty] = useState('')
  const [error, setError] = useState('')
  const create = useCreateStockOrder(order => {
    toast.add({ type: 'success', title: `Stock order ${order} created — ${card.product_id}` })
    onClose()
  })
  const shown = qty || (card.order_qty === null ? '' : String(card.order_qty))

  const submit = () => {
    const quantity = Number(shown)
    if (!Number.isInteger(quantity) || quantity < 1)
      return setError('Order Qty must be greater than 0.')
    setError('')
    create.mutate([{ product_id: card.product_id, quantity }])
  }

  return (
    <>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='card-order-pid'>Product ID</Label>
          <Input id='card-order-pid' readOnly value={card.product_id} />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='card-order-desc'>Description</Label>
          <Input id='card-order-desc' readOnly value={card.description ?? ''} />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='card-order-qty'>Order Qty</Label>
          <Input
            id='card-order-qty'
            type='number'
            min={1}
            inputMode='numeric'
            value={shown}
            onChange={event => setQty(event.target.value)}
          />
        </div>
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      <DialogFooter>
        <Button variant='outline' onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={create.isPending} onClick={submit}>
          {create.isPending ? <Spinner data-icon='inline-start' /> : null}
          Create order
        </Button>
      </DialogFooter>
    </>
  )
}

type CardOrderDialogProps = {
  card: StockCard | null
  onOpenChange: (open: boolean) => void
}

/**
 * What scanning a card does, reached by clicking its QR: a stock order for this one product, its
 * quantity prefilled from the card and still open to change.
 */
const CardOrderDialog = ({ card: current, onOpenChange }: CardOrderDialogProps) => {
  const [card, release] = useRetained(current)

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Create stock order</DialogTitle>
          <DialogDescription>Prefilled from the stock card.</DialogDescription>
        </DialogHeader>

        {card ? <CardOrderForm card={card} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

const matches = (card: StockCard, term: string) =>
  !term ||
  card.product_id.toLowerCase().includes(term) ||
  (card.description ?? '').toLowerCase().includes(term)

type StockCardsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The Stock Cards panel: the printable QR labels the floor scans to raise a stock order.
 *
 * The card face has no drawing and no width, gauge or colour to show or filter by: the card carries
 * an image id but no URL, and none of those fields — see TODO.md.
 */
export const StockCardsDialog = ({ open, onOpenChange }: StockCardsDialogProps) => {
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<StockCard | null>(null)
  const [asking, releaseAsking] = useRetained(deleting)
  const [ordering, setOrdering] = useState<StockCard | null>(null)
  const [cardForm, setCardForm] = useState<StockCard | 'new' | null>(null)
  const { data: cards, isPending } = useQuery({ ...stockCardsQuery, enabled: open })
  const remove = useDeleteStockCard()

  const term = search.trim().toLowerCase()
  const shown = cards?.filter(card => matches(card, term)) ?? []

  // A deleted card must not stay ticked: the count and the print payload would carry an id the
  // server no longer knows.
  const drop = (id: number) =>
    setSelected(current => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  const print = usePrintStockCards(() => {
    toast.add({
      type: 'success',
      title: `${selected.size} card${selected.size > 1 ? 's' : ''} sent to print`
    })
    setSelected(new Set())
  })

  const toggle = (id: number) => setSelected(current => toggled(current, id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Stock Cards</DialogTitle>
          <DialogDescription>
            Tick the cards you want and print them. Scanning a printed card — or clicking its QR —
            raises a stock order.
          </DialogDescription>
        </DialogHeader>

        <div className='flex items-center gap-3'>
          <span className='text-sm whitespace-nowrap text-muted-foreground'>
            <span className='font-medium text-foreground'>{shown.length}</span> of{' '}
            {cards?.length ?? 0} cards
          </span>
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type='search'
              aria-label='Search stock cards'
              placeholder='Search product ID or description…'
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </InputGroup>
        </div>

        {/* The placeholders and the empty states are all the floor's height, so the centred sheet does
            not jump when the answer lands. The placeholder rows stretch to share it rather than
            carrying heights of their own that would add up to something else. */}
        <div className='scrollport max-h-96 min-h-56 overflow-y-auto'>
          {isPending ? (
            <div className='grid h-56 gap-3 sm:grid-cols-2'>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} />
              ))}
            </div>
          ) : shown.length ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              {shown.map(card => (
                <div
                  key={card.id}
                  className='flex flex-col gap-3 rounded-lg border border-border p-3'
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-2'>
                      <Checkbox
                        id={`print-${card.id}`}
                        aria-label={`Select ${card.product_id} for printing`}
                        checked={selected.has(card.id)}
                        onCheckedChange={() => toggle(card.id)}
                      />
                      <Label htmlFor={`print-${card.id}`}>Print Select</Label>
                    </div>
                    <span className='flex items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label={`Edit ${card.product_id}`}
                        onClick={() => setCardForm(card)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label={`Delete ${card.product_id}`}
                        onClick={() => setDeleting(card)}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </div>

                  <div className='flex items-start gap-3'>
                    <div className='min-w-0 flex-1'>
                      <p className='font-mono text-sm font-medium'>{card.product_id}</p>
                      <p className='truncate text-xs text-muted-foreground uppercase'>
                        {card.description ?? '—'}
                      </p>
                    </div>
                    <Button
                      variant='outline'
                      size='icon'
                      aria-label={`Create a stock order for ${card.product_id}`}
                      title='Scan (or click) to create a stock order'
                      onClick={() => setOrdering(card)}
                    >
                      <QrCode />
                    </Button>
                  </div>

                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <p className='text-xs tracking-wider text-muted-foreground uppercase'>
                        Stock minimum
                      </p>
                      <p className='font-mono text-lg'>{card.stock_minimum ?? '—'}</p>
                    </div>
                    <div>
                      <p className='text-xs tracking-wider text-muted-foreground uppercase'>
                        Order qty
                      </p>
                      <p className='font-mono text-lg'>{card.order_qty ?? '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : cards?.length ? (
            <Empty className='min-h-56'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>No stock cards match</EmptyTitle>
                <EmptyDescription>Try a different search term.</EmptyDescription>
              </EmptyHeader>
              <Button variant='outline' onClick={() => setSearch('')}>
                Clear search
              </Button>
            </Empty>
          ) : (
            <Empty className='min-h-56'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <QrCode />
                </EmptyMedia>
                <EmptyTitle>No stock cards</EmptyTitle>
                <EmptyDescription>Create one to print and scan.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant='outline' onClick={() => setCardForm('new')}>
            <Plus data-icon='inline-start' />
            Create stock card
          </Button>
          <Button
            disabled={!selected.size || print.isPending}
            onClick={() => print.mutate([...selected])}
          >
            {print.isPending ? (
              <Spinner data-icon='inline-start' />
            ) : (
              <Printer data-icon='inline-start' />
            )}
            Print selected{selected.size ? ` (${selected.size})` : ''}
          </Button>
        </DialogFooter>

        <StockCardDialog target={cardForm} onOpenChange={open => !open && setCardForm(null)} />

        <ConfirmDialog
          open={!!deleting}
          onOpenChange={next => !next && setDeleting(null)}
          onOpenChangeComplete={releaseAsking}
          title='Delete stock card?'
          description={`This removes ${asking?.product_id ?? ''} (${asking?.description ?? '—'}) from the list. This can’t be undone.`}
          confirmLabel='Confirm'
          cancelLabel='Cancel'
          isPending={remove.isPending}
          onConfirm={() => {
            if (!asking) return
            remove.mutate(asking.id, {
              onSuccess: () => {
                drop(asking.id)
                setDeleting(null)
                toast.add({ type: 'success', title: `Stock card ${asking.product_id} deleted` })
              }
            })
          }}
        />
        <CardOrderDialog card={ordering} onOpenChange={next => !next && setOrdering(null)} />
      </DialogContent>
    </Dialog>
  )
}
