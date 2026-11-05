import { Description } from '@/components/description'
import { QueryError } from '@/components/query-error'
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
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { PackageX } from 'lucide-react'
import { spoiledPartsQuery } from '../api'
import { SPOILED_TABLE } from '../lib/columns'
import { formatPieces, machineName, type MachineScope } from '../lib/figures'
import type { Period } from '../lib/period'

type SpoiledPartsDialogProps = {
  departmentId: number
  period: Period
  /** `null` when closed. */
  scope: MachineScope | null
  onOpenChange: (open: boolean) => void
}

/** The spoiled parts behind a figure of the summary: each Stock change past the release figure. */
export const SpoiledPartsDialog = ({
  departmentId,
  period,
  scope,
  onOpenChange
}: SpoiledPartsDialogProps) => {
  const [shown, release] = useRetained(scope)
  const columns = useColumnOrder(SPOILED_TABLE)
  const { data, isPending, error, refetch } = useQuery({
    ...spoiledPartsQuery(departmentId, period),
    enabled: !!scope
  })
  const every = shown === 'every'
  const parts = data?.filter(part => every || part.flow_id === shown?.flowId)

  return (
    <Dialog open={!!scope} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent sizeKey='reports:spoiled-parts-dialog' className='sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>
            Spoiled parts · {every ? 'All machines' : machineName(shown?.machine ?? null)}
          </DialogTitle>
          <DialogDescription>
            Stock taken past what the line had at release, {formatDate(period.from)} to{' '}
            {formatDate(period.to)}.
          </DialogDescription>
        </DialogHeader>

        {/* A phone's drawer scrolls as one; a box scrolling inside it would fight the swipe. */}
        <div data-dialog-grow className='scrollport min-h-56 md:max-h-120 md:overflow-y-auto'>
          {error && !data ? (
            <QueryError
              title='The spoiled parts did not load'
              error={error}
              onRetry={() => void refetch()}
            />
          ) : isPending ? (
            <Skeleton className='h-56' />
          ) : parts?.length ? (
            <div className='overflow-hidden rounded-lg border border-border'>
              <Table data-cards className='table-fixed'>
                <colgroup>{columns.cols}</colgroup>
                <TableHeader>
                  <TableRow>{columns.headers}</TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map(part => (
                    <TableRow key={part.id}>
                      {columns.cells({
                        when: <TableCell>{formatStamp(part.created_at) || '—'}</TableCell>,
                        order: (
                          <TableCell>
                            <span className='font-mono'>{part.order_number ?? '—'}</span>
                          </TableCell>
                        ),
                        description: (
                          <TableCell>
                            <Description text={part.description ?? part.product_id ?? '—'} />
                          </TableCell>
                        ),
                        machine: <TableCell>{machineName(part.machine)}</TableCell>,
                        release: (
                          <TableCell>
                            <span className='font-mono'>{formatPieces(part.at_release)}</span>
                          </TableCell>
                        ),
                        stock: (
                          <TableCell>
                            <span className='font-mono'>
                              {formatPieces(part.before)} → {formatPieces(part.after)}
                            </span>
                          </TableCell>
                        ),
                        spoiled: (
                          <TableCell>
                            <span className='font-mono font-semibold'>
                              {formatPieces(part.spoiled)}
                            </span>
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
                  <PackageX />
                </EmptyMedia>
                <EmptyTitle>No spoiled parts</EmptyTitle>
                <EmptyDescription>Nothing was taken from stock past release.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
