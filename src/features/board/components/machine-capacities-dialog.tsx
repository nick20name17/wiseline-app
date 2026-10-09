import { formatDate, today } from '@/lib/days'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Printer } from 'lucide-react'
import { machineCapacitiesQuery, machineLoad } from '../api'

// Feet come back to the hundredth; the report reads whole ones.
const whole = (value: number) => Math.round(value)

type MachineCapacitiesDialogProps = {
  departmentId: number | undefined
  /** The production day being broken down; `null` closes the dialog. */
  day: string | null
  onOpenChange: (open: boolean) => void
}

type FigureProps = {
  value: number
  /** Pieces have no ceiling; bends do. */
  max?: number | null
  /** The server's verdict against `max`, not worked out here. */
  over?: boolean
  /** Part of the value beside it, never an addition to it. */
  fromStock?: number
  /** The day still has trim with no machine, which is what the gap below this row is. */
  unrouted?: boolean
}

/**
 * The figure, its limit and how much of it comes off the shelf, on one line.
 *
 * Value, slash, max and the parenthetical are tracks of one fixed-width row, so the slashes and the
 * «(n - Stock)» notes line up down the column without the slash being dragged from its own number.
 */
const Figure = ({ value, max, over = false, fromStock = 0, unrouted }: FigureProps) => (
  <span className='inline-flex w-40 items-baseline font-mono text-sm font-semibold'>
    {/* Over the max outranks not-yet-routed: it is the harder warning of the two. */}
    <span className={cn(over && 'text-destructive', !over && unrouted && 'text-warning')}>
      {whole(value)}
    </span>
    {max ? (
      <>
        <span className='mx-1.5 text-muted-foreground'>/</span>
        <span className={cn(over && 'text-destructive')}>{whole(max)}</span>
      </>
    ) : null}
    {fromStock ? (
      <span className='ml-auto pl-2 text-xs font-normal text-primary'>({fromStock} - Stock)</span>
    ) : null}
  </span>
)

const Row = ({
  name,
  isDay,
  title,
  children
}: {
  name: React.ReactNode
  isDay?: boolean
  title?: string
  children: React.ReactNode
}) => (
  <tr title={title}>
    {/* Each cell paints its own edges, so a row reads as one card. The day is the report's headline
        figure, so its card is white against the machines' grey. */}
    <th
      scope='row'
      className={cn(
        'w-2/5 rounded-l-lg border border-r-0 border-input px-3.5 py-2 text-left text-sm font-semibold',
        isDay ? 'bg-card' : 'bg-muted'
      )}
    >
      {name}
    </th>
    {children}
  </tr>
)

const Cell = ({ isDay, children }: { isDay?: boolean; children: React.ReactNode }) => (
  <td
    className={cn(
      'border-y border-input px-3.5 py-2 text-left whitespace-nowrap last:rounded-r-lg last:border-r',
      isDay ? 'bg-card' : 'bg-muted'
    )}
  >
    {children}
  </td>
)

/**
 * One production day, read-only.
 *
 * The top row is everything the day has scheduled; the machine rows are only what has been routed to
 * a machine. The two are deliberately not the same number — the gap is trim with a day and no machine
 * yet, and summing the machines instead would hide exactly the work nobody has claimed.
 *
 * Daily maxes are not set here. They belong to Settings › Machines, and a report that let you edit its
 * own limits would be a second place for them to disagree.
 */
export const MachineCapacitiesDialog = ({
  departmentId,
  day: current,
  onOpenChange
}: MachineCapacitiesDialogProps) => {
  const [day, release] = useRetained(current)
  const { data, isPending } = useQuery(machineCapacitiesQuery(departmentId, day))
  // Trim's machines are held to bends, Rollforming's to linear feet: the second column is the day's
  // own unit, the one its Daily Max is set in.
  const unit = data?.total.capacity_unit ?? 'bends'
  const feet = unit === 'linear_feet'
  const total = data ? (feet ? data.total.linear_feet : data.total.bends) : 0
  // The report names the pieces with no machine; the rest is whatever the machines do not add up to.
  const unroutedPieces = data?.pieces_without_a_machine ?? 0
  const unroutedMeasure = data
    ? Math.max(
        0,
        total - data.machines.reduce((sum, machine) => sum + machineLoad(machine, unit).value, 0)
      )
    : 0
  const unrouted = unroutedPieces > 0 || unroutedMeasure >= 1

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent data-print-report className='sm:max-w-2xl'>
        <DialogHeader>
          <div className='text-center'>
            <DialogTitle>Machine Capacities</DialogTitle>
            {/* It explains the colours on screen; on paper the figures speak for themselves. */}
            <DialogDescription data-print-hide>
              Report · what this production day has assigned to each machine. Over the daily max is
              a soft warning — it highlights, never blocks.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* A department with a long machine list should not push Print off the screen. The floor
            is the placeholder's own height, so Print stays where it was rather than
            dropping down the sheet once the figures arrive. */}
        <div data-print-expand className='scrollport max-h-96 min-h-64 overflow-y-auto'>
          {isPending || !data ? (
            <Skeleton className='h-64' />
          ) : (
            <table className='w-full border-separate border-spacing-y-1'>
              <thead>
                <tr>
                  {/* The row names sit under this one; it heads nothing of its own. */}
                  <th>
                    <span className='sr-only'>Machine</span>
                  </th>
                  {/* Each heading is ruled on its own, so the two lines have a gap between them. */}
                  <th className='border-b-2 border-foreground px-3.5 pb-1 text-center text-sm font-bold'>
                    Pieces
                  </th>
                  <th className='border-b-2 border-foreground px-3.5 pb-1 text-center text-sm font-bold'>
                    {feet ? 'Linear Feet' : 'Bends'}
                  </th>
                </tr>
              </thead>
              <tbody>
                <Row
                  isDay
                  title={
                    unrouted
                      ? `${whole(unroutedMeasure)} ${feet ? 'ft' : 'bends'} (${unroutedPieces} pcs) scheduled but not routed to a machine yet`
                      : undefined
                  }
                  name={
                    <>
                      {formatDate(data.date)}
                      {data.date === today() ? (
                        <span className='font-normal text-muted-foreground'> · today</span>
                      ) : null}
                    </>
                  }
                >
                  <Cell isDay>
                    <Figure
                      value={data.total.pieces}
                      fromStock={data.total.pieces_from_stock}
                      unrouted={unrouted}
                    />
                  </Cell>
                  <Cell isDay>
                    <Figure
                      value={total}
                      max={data.total.capacity}
                      over={data.total.over_capacity}
                      fromStock={feet ? 0 : data.total.bends_from_stock}
                      unrouted={unrouted}
                    />
                  </Cell>
                </Row>

                {data.machines.map(machine => (
                  <Row key={machine.flow_id} name={machine.name ?? `Machine ${machine.flow_id}`}>
                    <Cell>
                      <Figure value={machine.pieces} fromStock={machine.pieces_from_stock} />
                    </Cell>
                    <Cell>
                      <Figure {...machineLoad(machine, unit)} />
                    </Cell>
                  </Row>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div data-print-hide className='flex justify-center'>
          <Button disabled={isPending || !data} onClick={() => window.print()}>
            <Printer data-icon='inline-start' />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
