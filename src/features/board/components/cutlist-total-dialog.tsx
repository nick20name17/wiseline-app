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
import { Layers } from 'lucide-react'
import { CUTLIST_TOTAL_TABLE } from '../lib/columns'
import { drawingOf, linesOf, type CutlistGroup } from '../lib/cutlists'
import { DrawingCell } from './drawing-cell'
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
 * The board's columns p1 (538,353).
 */
export const CutlistTotalDialog = ({ group: current, onOpenChange }: CutlistTotalDialogProps) => {
  const [group, release] = useRetained(current)
  const columns = useColumnOrder(CUTLIST_TOTAL_TABLE)
  // The word takes the first column that is not the figure's own, so dragging Qty to mfg to the
  // front moves «Total» along rather than losing it.
  const totalLabel = columns.order.find(key => key !== 'qty')
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
                  {entries.map(entry => (
                    <TableRow key={entry.origin_item ?? entry.order}>
                      {columns.cells({
                        order: (
                          <TableCell>
                            <Figure value={entry.order_number ?? entry.order} />
                          </TableCell>
                        ),
                        customer: (
                          <TableCell>
                            <span className='truncate'>{entry.customer ?? '—'}</span>
                          </TableCell>
                        ),
                        po: (
                          <TableCell>
                            <Figure value={entry.po_number} />
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
                        ),
                        drawing: (
                          <TableCell>
                            <DrawingCell
                              drawing={drawingOf(entry.product_files)}
                              product={entry.product_id}
                            />
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
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
