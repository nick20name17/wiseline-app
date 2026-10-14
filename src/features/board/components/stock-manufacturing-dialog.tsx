import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Factory } from 'lucide-react'
import {
  manufacturingBatchesQuery,
  useCreateStockManufacturing,
  type StockCardOption
} from '../api'
import { formatStamp } from '../lib/format'
import { pickedProduct } from '../lib/product-pick'
import { ProductPicker } from './product-picker'

// `productId` is the text in the box and `product` the last pick; the line names a product only while
// the two agree.
type Line = { id: string; quantity: string; productId: string; product: StockCardOption | null }

const emptyLine = (): Line => ({
  id: crypto.randomUUID(),
  quantity: '',
  productId: '',
  product: null
})

const productOf = (line: Line) => pickedProduct(line.productId, line.product)
// A row counts once it has a quantity and a picked product; the grid always keeps one empty row.
const filled = (line: Line) => Number(line.quantity) > 0 && !!productOf(line)
const blank = (line: Line) => !line.quantity.trim() && !line.productId.trim()

type StockManufacturingDialogProps = {
  departmentId: number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Stock Manufacturing: pieces the floor made against no order, entered as Qty and ID and sent to EBMS
 * as one manufacturing batch (p1 (1009,302), (1025,338)). The Sent tab is what has already gone.
 */
export const StockManufacturingDialog = ({
  departmentId,
  open,
  onOpenChange
}: StockManufacturingDialogProps) => {
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()])
  const [view, setView] = useState<'new' | 'sent'>('new')
  const [error, setError] = useState('')
  const { data: batches } = useQuery(
    manufacturingBatchesQuery(departmentId, open && view === 'sent')
  )
  const create = useCreateStockManufacturing(batch => {
    toast.add({
      type: 'success',
      title: `Manufacturing batch ${batch.ebms_batch ?? batch.id} created`
    })
    setLines([emptyLine()])
    setError('')
    onOpenChange(false)
  })

  // A half-filled row, or an ID EBMS does not have, is refused by the server; it is said here first.
  const submit = () => {
    const started = lines.filter(line => !blank(line))
    if (!started.length) return setError('Enter at least one Qty and ID.')
    const unknown = started.filter(line => line.productId.trim() && !productOf(line))
    if (unknown.length)
      return setError(
        `Pick each ID from the list — ${unknown.map(line => line.productId.trim()).join(', ')} ${unknown.length === 1 ? 'is' : 'are'} not a Trim product in EBMS.`
      )
    if (started.some(line => !productOf(line))) return setError('Every row with a Qty needs an ID.')
    if (started.some(line => !(Number(line.quantity) > 0)))
      return setError('Every row needs a Qty of 1 or more.')
    setError('')
    if (departmentId)
      create.mutate({
        departmentId,
        lines: started.filter(filled).map(line => ({
          quantity: Number(line.quantity),
          product_id: productOf(line)!.product_id
        }))
      })
  }

  const edit = (index: number, patch: Partial<Line>) => {
    // The message was about the grid as it was; an edit may have answered it, and Create says again.
    setError('')
    setLines(current => {
      const next = current.map((line, at) => (at === index ? { ...line, ...patch } : line))
      const last = next.at(-1)
      return last && blank(last) ? next : [...next, emptyLine()]
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={next => !next && setView('new')}
    >
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Stock Manufacturing</DialogTitle>
          <DialogDescription>
            Enter the stock items made against no order. They go to EBMS as one manufacturing batch.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={view} onValueChange={value => setView(value as 'new' | 'sent')}>
          <TabsList variant='line'>
            <TabsTrigger value='new'>New batch</TabsTrigger>
            <TabsTrigger value='sent'>Sent · past 90 days</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className='scrollport min-h-40 md:max-h-96 md:overflow-y-auto'>
          {view === 'new' ? (
            // Labels over the boxes, as Create stock order has them: the lines are a form being
            // written, not a table of records.
            <div className='space-y-2'>
              <div className='flex items-center gap-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                <span className='w-24'>Qty</span>
                <span className='flex-1'>Product ID</span>
              </div>
              {lines.map((line, index) => (
                <div key={line.id} className='flex items-center gap-3'>
                  <Input
                    className='w-24'
                    type='number'
                    min={1}
                    inputMode='numeric'
                    aria-label={`Quantity, row ${index + 1}`}
                    placeholder='0'
                    value={line.quantity}
                    onChange={event => edit(index, { quantity: event.target.value })}
                  />
                  <ProductPicker
                    className='flex-1'
                    label={`Product ID, row ${index + 1}`}
                    text={line.productId}
                    onTextChange={productId => edit(index, { productId })}
                    picked={line.product}
                    onPick={product =>
                      edit(
                        index,
                        product ? { product, productId: product.product_id } : { product }
                      )
                    }
                    invalid={!!error && !!line.productId.trim() && !productOf(line)}
                  />
                </div>
              ))}
            </div>
          ) : batches?.length ? (
            <Table data-cards>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map(batch => (
                  <TableRow key={batch.id}>
                    <TableCell card='subtitle'>
                      <span className='font-mono text-xs'>
                        {batch.created_at ? formatStamp(batch.created_at) : '—'}
                      </span>
                    </TableCell>
                    <TableCell card='title'>
                      <span className='font-mono'>{batch.ebms_batch ?? '—'}</span>
                    </TableCell>
                    <TableCell label='From'>{batch.order ?? 'Stock Manufacturing'}</TableCell>
                    <TableCell label='Items' card='full'>
                      <span className='text-muted-foreground'>
                        {batch.lines
                          .map(line => `${line.quantity} × ${line.product_id}`)
                          .join(', ')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty className='min-h-40'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Factory />
                </EmptyMedia>
                <EmptyTitle>Nothing sent in the past 90 days</EmptyTitle>
                <EmptyDescription>
                  Batches created here and from stock orders show up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        {view === 'new' && error ? <FieldError>{error}</FieldError> : null}

        {view === 'new' ? (
          <DialogFooter>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={create.isPending} onClick={submit}>
              {create.isPending ? <Spinner data-icon='inline-start' /> : null}
              Create Manufacturing Batch
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
