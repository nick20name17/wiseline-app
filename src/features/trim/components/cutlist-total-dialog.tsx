import { useColumnOrder } from '@/components/table/column-order'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { scheduledOrdersQuery } from '../api'
import { CUTLIST_TOTAL_TABLE } from '../lib/columns'
import { linesOf, type CutlistGroup } from '../lib/cutlists'
import { Figure } from './figure'

type CutlistTotalDialogProps = {
  group: CutlistGroup | null
  onOpenChange: (open: boolean) => void
}

/**
 * What a consolidated Total is made of. Identical sizes collapse into one row so the floor cuts them
 * together, which is right for cutting and useless for answering «whose is this» — this is that
 * answer, so it names the orders and their lines rather than repeating the size.
 *
 * The row's sources describe each line; only the order's number and customer are read off the
 * Scheduled tab, since a source names its order by autoid. PO# and Drawing have nothing behind them
 * yet (TODO.md).
 */
export const CutlistTotalDialog = ({ group: current, onOpenChange }: CutlistTotalDialogProps) => {
  const [group, release] = useRetained(current)
  const columns = useColumnOrder(CUTLIST_TOTAL_TABLE)
  // The word takes the first column that is not the figure's own, so dragging Qty to mfg to the
  // front moves «Total» along rather than losing it.
  const totalLabel = columns.order.find(key => key !== 'qty')
  const { data: orders } = useQuery({ ...scheduledOrdersQuery(undefined), enabled: !!group })
  const byOrder = new Map(orders?.results.map(order => [order.id, order]))
  const entries = group ? linesOf(group) : []

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent className='sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Orders using this size</DialogTitle>
          <DialogDescription>
            {group
              ? `${group.width?.toFixed(1) ?? '—'}" × ${group.length ?? '—'}" — the orders behind this Total.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className='scrollport max-h-96 min-h-40 overflow-y-auto'>
          {entries.length ? (
            <div className='overflow-hidden rounded-lg border border-border'>
              <Table>
                <TableHeader>
                  <TableRow>{columns.headers}</TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(entry => {
                    const order = entry.order ? byOrder.get(entry.order) : undefined
                    return (
                      <TableRow key={entry.origin_item ?? entry.order}>
                        {columns.cells({
                          order: (
                            <TableCell>
                              <Figure value={order?.invoice || entry.order} />
                            </TableCell>
                          ),
                          customer: (
                            <TableCell>
                              <span className='truncate'>
                                {entry.is_stock ? 'Stock' : (order?.customer ?? '—')}
                              </span>
                            </TableCell>
                          ),
                          pid: (
                            <TableCell>
                              <Figure value={entry.product_id} />
                            </TableCell>
                          ),
                          desc: (
                            <TableCell>
                              <span className='truncate text-muted-foreground'>
                                {entry.description ?? '—'}
                              </span>
                            </TableCell>
                          ),
                          qtyord: (
                            <TableCell>
                              <Figure value={entry.qty_ordered} />
                            </TableCell>
                          ),
                          stock: (
                            <TableCell>
                              <Figure value={entry.pull_from_stock || null} />
                            </TableCell>
                          ),
                          qty: (
                            <TableCell>
                              <Figure value={entry.quantity} />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
                {/* The figure the window was opened from, under the column it belongs to. */}
                <TableFooter>
                  <TableRow>
                    {columns.order.map(key =>
                      key === 'qty' ? (
                        <TableCell key={key}>
                          <span className='font-mono'>{group?.quantity ?? 0}</span>
                        </TableCell>
                      ) : (
                        <TableCell key={key}>{key === totalLabel ? 'Total' : null}</TableCell>
                      )
                    )}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <Empty className='min-h-40'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Layers />
                </EmptyMedia>
                <EmptyTitle>No orders behind this size</EmptyTitle>
                <EmptyDescription>
                  The row carries {group?.quantity ?? 0} pieces but no line items — the orders it
                  was built from are gone.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
