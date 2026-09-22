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
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { cutlistRowSourcesQuery } from '../api'
import type { CutlistGroup } from '../lib/cutlists'

type CutlistTotalDialogProps = {
  group: CutlistGroup | null
  onOpenChange: (open: boolean) => void
}

/**
 * What a consolidated Total is made of. Identical sizes collapse into one row so the floor cuts them
 * together, which is right for cutting and useless for answering «whose is this» — this is that
 * answer, so it names the orders rather than repeating the size.
 */
export const CutlistTotalDialog = ({ group, onOpenChange }: CutlistTotalDialogProps) => {
  const rowIds = group?.rows.map(row => row.id) ?? []
  const { data: sources, isPending } = useQuery(cutlistRowSourcesQuery(rowIds))

  // One order can be behind several of the group's rows — one per machine — and the breakdown is
  // read per order, not per row.
  const byOrder = new Map<string, { order: string; items: Set<string>; quantity: number }>()
  for (const source of sources ?? []) {
    const key = source.order ?? '—'
    const entry = byOrder.get(key) ?? { order: key, items: new Set<string>(), quantity: 0 }
    if (source.origin_item) entry.items.add(source.origin_item)
    entry.quantity += source.quantity
    byOrder.set(key, entry)
  }
  const orders = [...byOrder.values()]

  return (
    <Dialog open={!!group} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Orders using this size</DialogTitle>
          <DialogDescription>
            {group
              ? `${group.width?.toFixed(1) ?? '—'}" × ${group.length ?? '—'}" — the orders this total was cut for.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className='scrollport max-h-96 min-h-40 overflow-y-auto'>
          {isPending ? (
            <Skeleton className='h-40' />
          ) : orders.length ? (
            <div className='overflow-hidden rounded-lg border border-border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Line items</TableHead>
                    <TableHead>Qty to manufacture</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(entry => (
                    <TableRow key={entry.order}>
                      <TableCell>
                        <span className='font-mono'>{entry.order}</span>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono text-muted-foreground'>
                          {[...entry.items].join(', ') || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono'>{entry.quantity}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {/* The figure the window was opened from, under the column it belongs to. */}
                <TableFooter>
                  <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell />
                    <TableCell>
                      <span className='font-mono'>{group?.quantity ?? 0}</span>
                    </TableCell>
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
