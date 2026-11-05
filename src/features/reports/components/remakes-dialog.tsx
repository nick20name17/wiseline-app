import { Description } from '@/components/description'
import { QueryError } from '@/components/query-error'
import { StatusPill } from '@/components/status-pill'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/dialog'
import { useColumnOrder } from '@/components/table/column-order'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatStamp } from '@/lib/days'
import { itemStatus } from '@/lib/status'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { remakesQuery } from '../api'
import { REMAKES_TABLE } from '../lib/columns'
import { formatPieces, machineName, type MachineScope } from '../lib/figures'
import type { Period } from '../lib/period'

const SOURCES: Record<string, string> = { wrapping: 'Wrapping', machine: 'Machine' }

type RemakesDialogProps = {
  departmentId: number
  period: Period
  /** `null` when closed. */
  scope: MachineScope | null
  onOpenChange: (open: boolean) => void
}

/**
 * The remakes behind a figure of the summary. A remake does not record which machine spoiled the
 * piece, so it counts on the line's machine, as the summary does.
 */
export const RemakesDialog = ({
  departmentId,
  period,
  scope,
  onOpenChange
}: RemakesDialogProps) => {
  // Kept through the closing animation, so the title and rows do not change under it.
  const [shown, release] = useRetained(scope)
  const columns = useColumnOrder(REMAKES_TABLE)
  const { data, isPending, error, refetch } = useQuery({
    ...remakesQuery(departmentId, period, shown ?? 'every'),
    enabled: !!scope
  })
  const remakes = data?.results

  return (
    <Dialog open={!!scope} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent sizeKey='reports:remakes-dialog' className='sm:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>
            Remakes · {!shown || shown === 'every' ? 'All machines' : machineName(shown.machine)}
          </DialogTitle>
          <DialogDescription>
            Remakes asked for, {formatDate(period.from)} to {formatDate(period.to)}.
            {data && data.count > data.results.length
              ? ` The latest ${data.results.length} of ${data.count}.`
              : null}
          </DialogDescription>
        </DialogHeader>

        {/* A phone's drawer scrolls as one; a box scrolling inside it would fight the swipe. */}
        <div data-dialog-grow className='scrollport min-h-56 md:max-h-120 md:overflow-y-auto'>
          {error && !data ? (
            <QueryError
              title='The remakes did not load'
              error={error}
              onRetry={() => void refetch()}
            />
          ) : isPending ? (
            <Skeleton className='h-56' />
          ) : remakes?.length ? (
            <div className='overflow-hidden rounded-lg border border-border'>
              <Table data-cards className='table-fixed'>
                <colgroup>{columns.cols}</colgroup>
                <TableHeader>
                  <TableRow>{columns.headers}</TableRow>
                </TableHeader>
                <TableBody>
                  {remakes.map(remake => (
                    <TableRow key={remake.id}>
                      {columns.cells({
                        when: <TableCell>{formatStamp(remake.created_at) || '—'}</TableCell>,
                        order: (
                          <TableCell>
                            <span className='font-mono'>{remake.order_number ?? '—'}</span>
                          </TableCell>
                        ),
                        description: (
                          <TableCell>
                            <Description text={remake.description ?? remake.product_id ?? '—'} />
                          </TableCell>
                        ),
                        machine: <TableCell>{machineName(remake.machine)}</TableCell>,
                        by: <TableCell>{remake.requested_by ?? '—'}</TableCell>,
                        source: (
                          <TableCell>
                            {(remake.source && SOURCES[remake.source]) ?? remake.source ?? '—'}
                          </TableCell>
                        ),
                        pieces: (
                          <TableCell>
                            <span className='font-mono font-semibold'>
                              {formatPieces(remake.remanufacturing_qty)}
                            </span>
                          </TableCell>
                        ),
                        status: (
                          <TableCell>
                            <StatusPill status={itemStatus(remake.status)} />
                          </TableCell>
                        ),
                        note: <TableCell>{remake.note || '—'}</TableCell>
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
                  <RotateCcw />
                </EmptyMedia>
                <EmptyTitle>No remakes</EmptyTitle>
                <EmptyDescription>Nobody asked for a remake in this period.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
