import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
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
import { manufacturingBatchesQuery, useCreateStockManufacturing } from '../api'
import { formatStamp } from '../lib/format'

type Line = { id: string; quantity: string; productId: string }

const emptyLine = (): Line => ({ id: crypto.randomUUID(), quantity: '', productId: '' })

// A row counts once both boxes are filled; the grid always keeps one empty row to type into.
const filled = (line: Line) => Number(line.quantity) > 0 && line.productId.trim() !== ''
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
  const { data: batches } = useQuery(
    manufacturingBatchesQuery(departmentId, open && view === 'sent')
  )
  const create = useCreateStockManufacturing(batch => {
    toast.add({
      type: 'success',
      title: `Manufacturing batch ${batch.ebms_batch ?? batch.id} created`
    })
    setLines([emptyLine()])
    onOpenChange(false)
  })

  // A half-filled row is refused by the server, so it holds the button until it is finished or cleared.
  const ready = lines.some(filled) && lines.every(line => filled(line) || blank(line))

  const edit = (index: number, patch: Partial<Line>) =>
    setLines(current => {
      const next = current.map((line, at) => (at === index ? { ...line, ...patch } : line))
      const last = next.at(-1)
      return last && blank(last) ? next : [...next, emptyLine()]
    })

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

        <div className='scrollport max-h-96 min-h-40 overflow-y-auto'>
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
                  <Input
                    className='flex-1'
                    aria-label={`Product ID, row ${index + 1}`}
                    placeholder='e.g. TJC8262'
                    value={line.productId}
                    onChange={event => edit(index, { productId: event.target.value.toUpperCase() })}
                  />
                </div>
              ))}
            </div>
          ) : batches?.length ? (
            <Table>
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
                    <TableCell>
                      <span className='font-mono text-xs'>
                        {batch.created_at ? formatStamp(batch.created_at) : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className='font-mono'>{batch.ebms_batch ?? '—'}</span>
                    </TableCell>
                    <TableCell>{batch.order ?? 'Stock Manufacturing'}</TableCell>
                    <TableCell>
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

        {view === 'new' ? (
          <DialogFooter>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!ready || create.isPending}
              title={ready ? undefined : 'Finish or clear every row first'}
              onClick={() =>
                departmentId &&
                create.mutate({
                  departmentId,
                  lines: lines.filter(filled).map(line => ({
                    quantity: Number(line.quantity),
                    product_id: line.productId.trim()
                  }))
                })
              }
            >
              {create.isPending ? <Spinner data-icon='inline-start' /> : null}
              Create Manufacturing Batch
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
