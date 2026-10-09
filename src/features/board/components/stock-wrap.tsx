import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { toggled } from '@/lib/sets'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Factory } from 'lucide-react'
import { useState } from 'react'
import {
  stockOrderRowsQuery,
  useCreateStockBatch,
  useSetStockWrapped,
  type StockOrderRow,
  type WrappingRow
} from '../api'
import { useViewOnly } from '../lib/board-context'
import { itemStatus } from '../lib/status'
import { lineName } from '../lib/wrapping'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Figure } from './figure'
import { KeypadDialog } from './keypad-dialog'
import { StatusPill } from './status-pill'
import { BenchHeader } from './wrap-order'

type StockWrapProps = {
  departmentId: number | undefined
  /** The order's rows on the Wrapping list — what the header counts. */
  rows: WrappingRow[]
  onBack: () => void
}

/**
 * A stock order at the bench is its own screen: no packages, no location, no labels. The worker keys in
 * what he wrapped, ticks the rows he is done with, and sends each one to EBMS as a manufacturing batch
 * at its Wrapped figure. Once every row has its batch, the order is complete (p1 (754,517)).
 */
export const StockWrap = ({ departmentId, rows, onBack }: StockWrapProps) => {
  const order = rows[0]
  const { data: lines, isPending } = useQuery(
    stockOrderRowsQuery(departmentId, order?.order ?? null)
  )
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
  const [keying, setKeying] = useState<StockOrderRow | null>(null)
  const [confirming, setConfirming] = useState(false)
  const setWrapped = useSetStockWrapped()
  const viewOnly = useViewOnly()
  const batch = useCreateStockBatch(({ completed, batch: number }) => {
    setConfirming(false)
    setChecked(new Set())
    // «Created», not «added to stock»: whether EBMS processes it at once is still being tried live.
    const created = number ? `Manufacturing batch ${number} created` : 'Manufacturing batch created'
    toast.add({
      type: 'success',
      title: completed ? `${created} — stock order moved to Completed` : created
    })
    if (completed) onBack()
  })

  if (!order) return null
  const number = order.order_number ?? order.order
  // A row can lose its checkbox under a tick (its Wrapped went back to 0), so only live ticks count.
  const picked = (lines ?? []).filter(line => line.can_select && checked.has(line.origin_item))

  const toggle = (originItem: string) => setChecked(current => toggled(current, originItem))

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <BenchHeader number={number} rows={rows} onBack={onBack} />

      <div className='overflow-x-auto rounded-lg border border-border bg-card shadow-xs'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-12'>
                <span className='sr-only'>Batch</span>
              </TableHead>
              <TableHead>Qty Ordered</TableHead>
              <TableHead>Left To Wrap</TableHead>
              <TableHead>Wrapped</TableHead>
              <TableHead>Qty Manufactured</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Length</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Skeleton className='h-16' />
                </TableCell>
              </TableRow>
            ) : (
              lines?.map(line => (
                <TableRow key={line.origin_item}>
                  <TableCell>
                    {/* A row with its batch shows it; the box waits for a Wrapped figure. */}
                    {line.manufactured ? (
                      <Factory
                        className='size-4 text-success'
                        aria-label='Manufacturing batch created'
                      />
                    ) : (
                      <Checkbox
                        aria-label={`Include ${lineName(line)} in the batch`}
                        checked={line.can_select && checked.has(line.origin_item)}
                        disabled={viewOnly || !line.can_select}
                        onCheckedChange={() => toggle(line.origin_item)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Figure value={line.qty_ordered} />
                  </TableCell>
                  <TableCell>
                    <Figure value={line.left_to_wrap} />
                  </TableCell>
                  <TableCell>
                    {line.manufactured ? (
                      <span className='text-muted-foreground'>—</span>
                    ) : viewOnly ? (
                      <Figure value={line.wrapped ?? 0} />
                    ) : (
                      <Button
                        variant='outline'
                        disabled={!line.can_wrap}
                        title={line.can_wrap ? 'Enter what has been wrapped' : 'Not made yet'}
                        onClick={() => setKeying(line)}
                      >
                        <span className='font-mono'>{line.wrapped ?? 0}</span>
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {line.qty_manufactured === null ? (
                      <span className='text-muted-foreground'>—</span>
                    ) : (
                      <span className='font-mono'>
                        <b>{line.qty_manufactured}</b> / {line.qty_ordered}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={itemStatus(line.status)} />
                  </TableCell>
                  <TableCell>
                    <span className='font-mono'>{line.product_id ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className='truncate text-muted-foreground'>
                      {line.description ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'font-mono',
                        line.length !== null && !line.is_standard_length && 'text-destructive'
                      )}
                    >
                      {line.length === null ? '—' : `${line.length}"`}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {viewOnly ? null : (
        <div className='flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-xs'>
          <span className='text-sm text-muted-foreground'>
            Stock order — no packages or locations. Tick the rows you are done wrapping.
          </span>
          <Button disabled={!picked.length} onClick={() => setConfirming(true)}>
            <Factory data-icon='inline-start' />
            Create Manufacturing Batch{picked.length ? ` (${picked.length})` : ''}
          </Button>
        </div>
      )}

      <KeypadDialog
        target={
          keying
            ? {
                title: `Wrapped · ${lineName(keying)}`,
                current: keying.wrapped ?? 0,
                max: keying.qty_ordered
              }
            : null
        }
        onOpenChange={open => !open && setKeying(null)}
        onEnter={wrapped => {
          if (!departmentId || !keying) return
          setWrapped.mutate({
            departmentId,
            order: order.order,
            originItem: keying.origin_item,
            wrapped
          })
          setKeying(null)
        }}
      />

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title='Create manufacturing batch?'
        description='This will create a manufacturing batch, are you sure that the amount(s) in the Wrapped column is (are) correct?'
        confirmLabel='Yes, Create Manufacturing Batch'
        cancelLabel='No'
        isPending={batch.isPending}
        onConfirm={() =>
          departmentId &&
          batch.mutate({
            departmentId,
            order: order.order,
            originItems: picked.map(line => line.origin_item)
          })
        }
      />
    </div>
  )
}
