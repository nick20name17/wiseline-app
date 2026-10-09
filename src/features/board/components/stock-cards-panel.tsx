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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { toggled } from '@/lib/sets'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { ImageOff, Pencil, Plus, Printer, QrCode, Search, SearchX, Trash2 } from 'lucide-react'
import { useDeferredValue, useState, type ReactNode } from 'react'
import { cn } from 'cn'
import {
  stockCardsQuery,
  useCreateStockOrder,
  useDeleteStockCard,
  usePrintStockCards,
  type StockCard,
  type StockCardLabel
} from '../api'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StockCardDialog } from './stock-card-dialog'
import { StockCardLabels } from './stock-card-labels'

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
          <Input id='card-order-pid' readOnly placeholder='No product ID' value={card.product_id} />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='card-order-desc'>Description</Label>
          <Input
            id='card-order-desc'
            readOnly
            placeholder='No description'
            value={card.description ?? ''}
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='card-order-qty'>Order Qty</Label>
          <Input
            id='card-order-qty'
            placeholder='e.g. 10'
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

type Filters = { term: string; color: string | null; gauge: string | null }

const matches = (card: StockCard, { term, color, gauge }: Filters) =>
  (color === null || card.color === color) &&
  (gauge === null || card.gauge === gauge) &&
  (!term ||
    card.product_id.toLowerCase().includes(term) ||
    (card.description ?? '').toLowerCase().includes(term))

/** Each value once, from the cards themselves — a filter never offers what would show nothing. */
const valuesOf = (values: (string | null)[], compare?: (a: string, b: string) => number) =>
  [...new Set(values.filter(value => value !== null))].toSorted(compare)

type FilterSelectProps = {
  label: string
  all: string
  values: string[]
  value: string | null
  onChange: (value: string | null) => void
  format?: (value: string) => string
}

const FilterSelect = ({ label, all, values, value, onChange, format }: FilterSelectProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={label} className='w-36 shrink-0'>
      <SelectValue>
        {(current: string | null) => (current === null ? all : (format?.(current) ?? current))}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={null}>{all}</SelectItem>
      {values.map(entry => (
        <SelectItem key={entry} value={entry}>
          {format?.(entry) ?? entry}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

/**
 * "Width: 8\"" Screen (122,324). The Manager's own width is the card's; without one, the width every
 * past order agrees on stands in, marked as only a suggestion.
 */
const CardWidth = ({ card }: { card: StockCard }) =>
  card.width !== null ? (
    <p className='text-xs text-muted-foreground'>Width: {card.width}&quot;</p>
  ) : card.width_from_orders !== null ? (
    <p
      className='text-xs text-muted-foreground'
      title='Not set on the card — the width past orders agree on'
    >
      Width: {card.width_from_orders}&quot; <span className='italic'>(suggested)</span>
    </p>
  ) : (
    <p className='text-xs text-muted-foreground'>Width: —</p>
  )

type StockCardTileProps = {
  card: StockCard
  selected: boolean
  onToggle: (id: number) => void
  onEdit: (card: StockCard) => void
  onDelete: (card: StockCard) => void
  onOrder: (card: StockCard) => void
}

/** One card's face — its own component, so a keystroke or a tick skips the cards it leaves as they were. */
const StockCardTile = ({
  card,
  selected,
  onToggle,
  onEdit,
  onDelete,
  onOrder
}: StockCardTileProps) => (
  <div className='flex flex-col gap-3 rounded-lg border border-border p-3'>
    <div className='flex items-center justify-between gap-3'>
      <div className='flex items-center gap-2'>
        <Checkbox
          id={`print-${card.id}`}
          aria-label={`Select ${card.product_id} for printing`}
          checked={selected}
          onCheckedChange={() => onToggle(card.id)}
        />
        <Label htmlFor={`print-${card.id}`}>Print Select</Label>
      </div>
      <span className='flex items-center gap-1'>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={`Edit ${card.product_id}`}
          onClick={() => onEdit(card)}
        >
          <Pencil />
        </Button>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={`Delete ${card.product_id}`}
          onClick={() => onDelete(card)}
        >
          <Trash2 />
        </Button>
      </span>
    </div>

    <div className='flex gap-3'>
      <div className='flex w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white'>
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={`Profile sketch of ${card.product_id}`}
            className='max-h-28 object-contain'
          />
        ) : (
          <ImageOff className='size-5 text-muted-foreground' aria-label='No image' />
        )}
      </div>

      <div className='flex min-w-0 flex-1 flex-col gap-2'>
        <div className='flex items-start gap-3'>
          <div className='min-w-0 flex-1'>
            <p className='font-mono text-sm font-medium'>{card.product_id}</p>
            <CardWidth card={card} />
          </div>
          <Button
            variant='outline'
            size='icon'
            aria-label={`Create a stock order for ${card.product_id}`}
            title='Scan (or click) to create a stock order'
            onClick={() => onOrder(card)}
          >
            <QrCode />
          </Button>
        </div>
        <p className='truncate text-xs font-medium uppercase'>{card.description ?? '—'}</p>
        <p className='text-xs text-muted-foreground'>
          {card.color ?? '—'} · {card.gauge === null ? '—' : `${card.gauge} ga`}
        </p>
      </div>
    </div>

    <div className='grid grid-cols-2 gap-3'>
      <div>
        <p className='text-xs tracking-wider text-muted-foreground uppercase'>Stock minimum</p>
        <p className='font-mono text-lg'>{card.stock_minimum ?? '—'}</p>
      </div>
      <div>
        <p className='text-xs tracking-wider text-muted-foreground uppercase'>Order qty</p>
        <p className='font-mono text-lg'>{card.order_qty ?? '—'}</p>
      </div>
    </div>
  </div>
)

type StockCardsPanelProps = {
  /** The cards are asked for only while the panel is on show. */
  enabled: boolean
  /** In a dialog the grid scrolls inside the sheet; on the page it runs down the page. */
  variant: 'dialog' | 'page'
  /** Where Create and Print Selected go: the dialog's footer, or the page's toolbar. */
  actions: (buttons: ReactNode) => ReactNode
}

/**
 * The Stock Cards panel: the printable QR labels the floor scans to raise a stock order. Each card
 * shows its face as printed Screen (81,388) — sketch, product, width, description — plus the colour
 * and gauge the panel filters by.
 */
export const StockCardsPanel = ({ enabled, variant, actions }: StockCardsPanelProps) => {
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [search, setSearch] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [gauge, setGauge] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<StockCard | null>(null)
  const [asking, releaseAsking] = useRetained(deleting)
  const [ordering, setOrdering] = useState<StockCard | null>(null)
  const [cardForm, setCardForm] = useState<StockCard | 'new' | null>(null)
  const { data: cards, isPending } = useQuery({ ...stockCardsQuery, enabled })
  const remove = useDeleteStockCard()

  // The input keeps up with the typing; the grid catches up when there is time for it.
  const term = useDeferredValue(search).trim().toLowerCase()
  const shown = cards?.filter(card => matches(card, { term, color, gauge })) ?? []
  const colors = valuesOf(cards?.map(card => card.color) ?? [])
  const gauges = valuesOf(cards?.map(card => card.gauge) ?? [], (a, b) => Number(a) - Number(b))

  const [printing, setPrinting] = useState<StockCardLabel[] | null>(null)
  const print = usePrintStockCards(setPrinting)

  const toggle = (id: number) => setSelected(current => toggled(current, id))

  const page = variant === 'page'
  // The page has the width for more cards a row than the sheet does.
  const columns = page ? 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'sm:grid-cols-2'

  const actionBar = actions(
    <>
      <Button variant='outline' onClick={() => setCardForm('new')}>
        <Plus data-icon='inline-start' />
        Create stock card
      </Button>
      <Button
        disabled={!selected.size || print.isPending || printing !== null}
        onClick={() => print.mutate([...selected])}
      >
        {print.isPending ? (
          <Spinner data-icon='inline-start' />
        ) : (
          <Printer data-icon='inline-start' />
        )}
        Print selected{selected.size ? ` (${selected.size})` : ''}
      </Button>
    </>
  )

  return (
    <>
      {page ? actionBar : null}
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
        <FilterSelect
          label='Filter by colour'
          all='All colours'
          values={colors}
          value={color}
          onChange={setColor}
        />
        <FilterSelect
          label='Filter by gauge'
          all='All gauges'
          values={gauges}
          value={gauge}
          onChange={setGauge}
          format={value => `${value} ga`}
        />
      </div>

      {/* The placeholders and the empty states are all the floor's height, so the centred sheet does
            not jump when the answer lands. The placeholder rows stretch to share it rather than
            carrying heights of their own that would add up to something else. */}
      <div className={cn(page ? 'min-h-56' : 'scrollport max-h-96 min-h-56 overflow-y-auto')}>
        {isPending ? (
          <div className={cn('grid h-56 gap-3', columns)}>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} />
            ))}
          </div>
        ) : shown.length ? (
          <div className={cn('grid gap-3', columns)}>
            {shown.map(card => (
              <StockCardTile
                key={card.id}
                card={card}
                selected={selected.has(card.id)}
                onToggle={toggle}
                onEdit={setCardForm}
                onDelete={setDeleting}
                onOrder={setOrdering}
              />
            ))}
          </div>
        ) : cards?.length ? (
          <Empty className='min-h-56'>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>No stock cards match</EmptyTitle>
              <EmptyDescription>Try a different search term or filter.</EmptyDescription>
            </EmptyHeader>
            <Button
              variant='outline'
              onClick={() => {
                setSearch('')
                setColor(null)
                setGauge(null)
              }}
            >
              Clear search and filters
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

      {page ? null : actionBar}

      <StockCardDialog target={cardForm} onOpenChange={open => !open && setCardForm(null)} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={next => !next && setDeleting(null)}
        onOpenChangeComplete={releaseAsking}
        title='Delete stock card?'
        destructive
        description={`This removes ${asking?.product_id ?? ''} (${asking?.description ?? '—'}) from the list. This can’t be undone.`}
        confirmLabel='Confirm'
        cancelLabel='Cancel'
        isPending={remove.isPending}
        onConfirm={() => {
          if (!asking) return
          remove.mutate(asking.id, {
            onSuccess: () => {
              // A deleted card must not stay ticked: the count and the print payload would carry an
              // id the server no longer knows.
              setSelected(current => {
                const next = new Set(current)
                next.delete(asking.id)
                return next
              })
              setDeleting(null)
              toast.add({ type: 'success', title: `Stock card ${asking.product_id} deleted` })
            }
          })
        }}
      />
      <CardOrderDialog card={ordering} onOpenChange={next => !next && setOrdering(null)} />
      {printing ? (
        <StockCardLabels
          labels={printing}
          onDone={() => {
            setPrinting(null)
            setSelected(new Set())
          }}
        />
      ) : null}
    </>
  )
}
