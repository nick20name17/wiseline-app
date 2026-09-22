import { useColumnOrder } from '@/components/table/column-order'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
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
import { cutlistRowSourcesQuery, scheduledOrdersQuery } from '../api'
import { CUTLIST_TOTAL_TABLE } from '../lib/columns'
import { indexLines, type CutlistGroup } from '../lib/cutlists'
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
 * A source says only which line it came from; the line itself is read off the Scheduled tab's
 * orders. PO# and Drawing have nothing behind them yet (TODO.md).
 */
export const CutlistTotalDialog = ({ group: current, onOpenChange }: CutlistTotalDialogProps) => {
  const [group, release] = useRetained(current)
  const columns = useColumnOrder(CUTLIST_TOTAL_TABLE)
  // The word takes the first column that is not the figure's own, so dragging Qty to mfg to the
  // front moves «Total» along rather than losing it.
  const totalLabel = columns.order.find(key => key !== 'qty')
  const rowIds = group?.rows.map(row => row.id) ?? []
  const { data: sources, isPending } = useQuery(cutlistRowSourcesQuery(rowIds))
  const { data: orders } = useQuery({ ...scheduledOrdersQuery(undefined, null), enabled: !!group })
  const lines = indexLines(orders?.results ?? [])

  // One line can be behind several of the group's rows — a machine's pieces and its vented ones —
  // and the breakdown is read per line, not per row.
  const byLine = new Map<string, { order: string; item: string | null; quantity: number }>()
  for (const source of sources ?? []) {
    const key = source.origin_item ?? `order:${source.order ?? '—'}`
    const entry = byLine.get(key) ?? {
      order: source.order ?? '—',
      item: source.origin_item,
      quantity: 0
    }
    entry.quantity += source.quantity
    byLine.set(key, entry)
  }
  const entries = [...byLine.entries()]

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
          {isPending ? (
            <Skeleton className='h-40' />
          ) : entries.length ? (
            <div className='overflow-hidden rounded-lg border border-border'>
              <Table>
                <TableHeader>
                  <TableRow>{columns.headers}</TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(([key, entry]) => {
                    const found = entry.item ? lines.get(entry.item) : undefined
                    return (
                      <TableRow key={key}>
                        {columns.cells({
                          order: (
                            <TableCell>
                              <Figure value={found?.order.invoice || entry.order} />
                            </TableCell>
                          ),
                          customer: (
                            <TableCell>
                              <span className='truncate'>{found?.order.customer ?? '—'}</span>
                            </TableCell>
                          ),
                          pid: (
                            <TableCell>
                              <Figure value={found?.line.id_inven} />
                            </TableCell>
                          ),
                          desc: (
                            <TableCell>
                              <span className='truncate text-muted-foreground'>
                                {found?.line.item?.description ?? found?.line.description ?? '—'}
                              </span>
                            </TableCell>
                          ),
                          qtyord: (
                            <TableCell>
                              <Figure value={found?.line.quantity} />
                            </TableCell>
                          ),
                          stock: (
                            <TableCell>
                              <Figure value={found?.line.item?.pull_from_stock || null} />
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
            <Empty className='h-full'>
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
