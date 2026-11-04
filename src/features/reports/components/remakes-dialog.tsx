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
import { useQuery } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { remakesQuery } from '../api'
import { REMAKES_TABLE } from '../lib/columns'
import { formatPieces } from '../lib/figures'
import type { Period } from '../lib/period'

const SOURCES: Record<string, string> = { wrapping: 'Wrapping', machine: 'Machine' }

type RemakesDialogProps = {
  departmentId: number
  period: Period
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The remakes behind the summary's total. Every machine's at once: a remake does not record which
 * machine spoiled the piece, and the list cannot be asked for one machine's.
 */
export const RemakesDialog = ({ departmentId, period, open, onOpenChange }: RemakesDialogProps) => {
  const columns = useColumnOrder(REMAKES_TABLE)
  const { data, isPending, error, refetch } = useQuery({
    ...remakesQuery(departmentId, period),
    enabled: open
  })
  const remakes = data?.results

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent sizeKey='reports:remakes-dialog' className='sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>Remakes · All machines</DialogTitle>
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
