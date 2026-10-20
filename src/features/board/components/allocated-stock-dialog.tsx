import { SearchInput } from '@/components/search-input'
import { useColumnOrder } from '@/components/table/column-order'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Database } from 'lucide-react'
import { useState } from 'react'
import { allocatedStockQuery } from '../api'
import { ALLOCATED_STOCK_TABLE } from '../lib/columns'

const DEBOUNCE_MS = 250
// Other people review and wrap while the report is open; it has to follow them (p1 (371,560)).
const LIVE_MS = 15_000

type AllocatedStockDialogProps = {
  departmentId: number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Every trim due to come from stock that has not been wrapped yet, across the orders marked Reviewed,
 * totalled per product and grouped by colour. Nothing accumulates behind it — the figures are read off
 * the line items on every call, which is what makes the report live.
 */
export const AllocatedStockDialog = ({
  departmentId,
  open,
  onOpenChange
}: AllocatedStockDialogProps) => {
  // The box answers every keystroke; the report is asked once the typing pauses.
  const [term, setTerm] = useState('')
  const search = useDebouncedValue(term.trim(), DEBOUNCE_MS)
  const columns = useColumnOrder(ALLOCATED_STOCK_TABLE)
  const { data: rows, isPending } = useQuery({
    ...allocatedStockQuery(departmentId, search || undefined),
    // A new term keeps the last answer on screen rather than dropping back to the placeholder.
    placeholderData: keepPreviousData,
    enabled: open && departmentId !== undefined,
    refetchInterval: LIVE_MS
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Allocated stock</DialogTitle>
          <DialogDescription>
            Trims assigned to come from stock on reviewed orders, not yet wrapped.
          </DialogDescription>
        </DialogHeader>

        <SearchInput
          label='Search allocated stock'
          placeholder='Product ID, description or colour...'
          value={term}
          onValueChange={setTerm}
        />

        {/* The floor is the placeholder's own height: the dialog is centred, so a box that grew from
            nothing into the answer would move the whole sheet under the pointer. */}
        {/* A phone's drawer scrolls as one; a box scrolling inside it would fight the swipe. */}
        <div className='scrollport min-h-56 md:max-h-96 md:overflow-y-auto'>
          {isPending ? (
            <Skeleton className='h-56' />
          ) : rows?.length ? (
            <div className='overflow-hidden rounded-lg border border-border'>
              <Table data-cards className='table-fixed'>
                <colgroup>{columns.cols}</colgroup>
                <TableHeader>
                  <TableRow>{columns.headers}</TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    // «A distinct line between the colours» p1 (336,554): a heavier rule above the
                    // first row of each, which the Colour column already names.
                    <TableRow
                      key={`${row.color}-${row.product_id}`}
                      data-divider={(row.starts_color_group && index > 0) || undefined}
                    >
                      {columns.cells({
                        color: <TableCell>{row.color ?? '—'}</TableCell>,
                        pid: (
                          <TableCell>
                            <span className='font-mono'>{row.product_id || '—'}</span>
                          </TableCell>
                        ),
                        desc: (
                          <TableCell>
                            <span className='truncate text-muted-foreground'>
                              {row.description ?? '—'}
                            </span>
                          </TableCell>
                        ),
                        qty: (
                          <TableCell>
                            <span className='font-mono'>{row.qty}</span>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty className='min-h-56'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Database />
                </EmptyMedia>
                <EmptyTitle>Nothing allocated</EmptyTitle>
                <EmptyDescription>
                  {search
                    ? `Nothing matches “${search}”.`
                    : 'Stock shows up here once a reviewed order takes trims from it.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
