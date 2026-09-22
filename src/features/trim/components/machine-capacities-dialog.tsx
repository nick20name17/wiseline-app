import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { machineCapacitiesQuery } from '../api'
import { formatDate } from '../lib/format'

type MachineCapacitiesDialogProps = {
  departmentId: number | undefined
  /** The production day being broken down; `null` closes the dialog. */
  day: string | null
  onOpenChange: (open: boolean) => void
}

/** A figure and, in brackets, how much of it is coming from stock rather than being made. */
const WithStock = ({ total, fromStock }: { total: number; fromStock: number }) => (
  <span className='font-mono'>
    {total}
    {fromStock > 0 ? <span className='text-muted-foreground'> ({fromStock} — Stock)</span> : null}
  </span>
)

/**
 * One production day broken down by machine: what the day holds in total, then what has been put on
 * each machine, each figure carrying how much of it comes from stock.
 */
export const MachineCapacitiesDialog = ({
  departmentId,
  day,
  onOpenChange
}: MachineCapacitiesDialogProps) => {
  const { data, isPending } = useQuery(machineCapacitiesQuery(departmentId, day))

  return (
    <Dialog open={!!day} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Machine capacities</DialogTitle>
          <DialogDescription>{day ? formatDate(day) : ''}</DialogDescription>
        </DialogHeader>

        {isPending || !data ? (
          <Skeleton className='h-48' />
        ) : (
          <>
            <div className='grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-3'>
              <div>
                <p className='text-xs tracking-wider text-muted-foreground uppercase'>Pieces</p>
                <WithStock total={data.total.pieces} fromStock={data.total.pieces_from_stock} />
              </div>
              <div>
                <p className='text-xs tracking-wider text-muted-foreground uppercase'>Bends</p>
                <WithStock total={data.total.bends} fromStock={data.total.bends_from_stock} />
              </div>
              <div>
                <p className='text-xs tracking-wider text-muted-foreground uppercase'>Daily max</p>
                <span className='font-mono'>{data.total.capacity ?? '—'}</span>
              </div>
            </div>

            <div className='overflow-hidden rounded-lg border border-border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead>Pieces</TableHead>
                    <TableHead>Bends</TableHead>
                    <TableHead>Daily max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.machines.map(machine => (
                    <TableRow key={machine.flow_id}>
                      <TableCell>{machine.name ?? '—'}</TableCell>
                      <TableCell>
                        <WithStock total={machine.pieces} fromStock={machine.pieces_from_stock} />
                      </TableCell>
                      <TableCell>
                        <span className={cn(machine.over_bends && 'text-destructive')}>
                          <WithStock total={machine.bends} fromStock={machine.bends_from_stock} />
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono text-muted-foreground'>
                          {machine.max_bends ?? '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Not on the board, but the header and the rows will not add up without it, and a
                Manager comparing them deserves to know why. */}
            {data.pieces_without_a_machine > 0 ? (
              <p className='text-xs text-muted-foreground'>
                <span className='font-mono'>{data.pieces_without_a_machine}</span> pieces are on
                this day with no machine assigned yet.
              </p>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
