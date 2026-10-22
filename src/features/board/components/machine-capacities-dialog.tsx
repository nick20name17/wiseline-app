import { formatLongDate, today } from '@/lib/days'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Printer } from 'lucide-react'
import { isMaker, machineCapacitiesQuery, machineLoad } from '../api'
import { formatCount as count } from '../lib/format'
import { Cap, Heading, Progress } from './capacity-parts'

type MachineCapacitiesDialogProps = {
  departmentId: number | undefined
  /** The production day being broken down; `null` closes the dialog. */
  day: string | null
  onOpenChange: (open: boolean) => void
}

type FigureProps = {
  value: number
  /** Part of the value beside it, never an addition to it. */
  fromStock?: number
  /** The day still has work with no machine, which is what the gap below this card is. */
  unrouted?: boolean
}

/** A total, with how much of it comes off Stock Orders underneath in the small blue line. */
const Figure = ({ value, fromStock = 0, unrouted }: FigureProps) => (
  <span className='flex flex-col items-center font-mono'>
    <span className={cn('text-sm', unrouted && 'text-warning')}>{count(value)}</span>
    {fromStock ? (
      <span className='text-xs whitespace-nowrap text-primary max-sm:whitespace-normal'>
        ({count(fromStock)} - Stock)
      </span>
    ) : null}
  </span>
)

// The day is the report's headline, the Slinet cuts for every machine, the rest are the machines;
// Vented is a count of the day's vented pieces, not a machine.
const TONES = {
  day: 'border-foreground bg-muted',
  slinet: 'border-primary/40 bg-primary/5',
  machine: 'border-input bg-card',
  vented: 'border-warning/40 bg-warning/10'
} as const

type CardProps = {
  tone: keyof typeof TONES
  name: React.ReactNode
  title?: string
  measure: React.ReactNode
  /** Left out, the measure spans both columns — the Slinet's pieces are its measure. */
  pieces?: React.ReactNode
}

/** One machine, the day or the Slinet: its row header carries the ceiling, its cells the totals. */
const Card = ({ tone, name, title, measure, pieces }: CardProps) => {
  // Each cell paints its own edges, so a row reads as one card.
  const cell = cn('border-y px-3.5 py-2 align-top max-sm:px-2', TONES[tone])
  const end = 'rounded-r-lg border-r'
  return (
    <tr title={title}>
      <th
        scope='row'
        className={cn(
          'rounded-l-lg border border-r-0 px-3.5 py-2 text-left font-normal max-sm:px-2.5',
          TONES[tone]
        )}
      >
        {name}
      </th>
      {pieces === undefined ? (
        <td colSpan={2} className={cn(cell, end)}>
          {measure}
        </td>
      ) : (
        <>
          <td className={cell}>{measure}</td>
          <td className={cn(cell, end)}>{pieces}</td>
        </>
      )}
    </tr>
  )
}

/**
 * One production day, read-only, laid out as the shop's paper report.
 *
 * The top card is everything the day has scheduled; the machine cards are only what has been routed
 * to a machine. The two are deliberately not the same number — the gap is work with a day and no
 * machine yet, and summing the machines instead would hide exactly the work nobody has claimed.
 *
 * The Slinet cuts every piece the day has, routed or not, so its card reads the day's pieces against
 * its own Daily Piece Cap; Wrapping comes after the machines and holds no ceiling, so it has none.
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
  const slinet = data?.machines.find(machine => machine.kind === 'cutting')
  const makers = data?.machines.filter(isMaker) ?? []
  // Trim's machines are held to bends, Rollforming's to linear feet: the measure is the day's own
  // unit, the one its Daily Max is set in.
  const unit = data?.total.capacity_unit ?? 'bends'
  const feet = unit === 'linear_feet'
  const measure = feet ? 'Linear Feet' : 'Bends'
  const capLabel = feet ? 'Daily Feet Cap' : 'Daily Bend Cap'
  const total = data ? (feet ? data.total.linear_feet : data.total.bends) : 0
  const totalDone = data ? (feet ? data.total.linear_feet_done : data.total.bends_done) : 0
  // The report names the pieces with no machine; the rest is whatever the machines do not add up to.
  const unroutedPieces = data?.pieces_without_a_machine ?? 0
  const unroutedMeasure = data
    ? Math.max(
        0,
        // Every routed row, the Slinet and Wrapping included: what they hold is routed, only not
        // shown as a machine card.
        total - data.machines.reduce((sum, machine) => sum + machineLoad(machine, unit).value, 0)
      )
    : 0
  const unrouted = unroutedPieces > 0 || unroutedMeasure >= 1
  const unroutedNote = `${count(unroutedMeasure)} ${feet ? 'ft' : 'bends'} (${count(unroutedPieces)} pcs) scheduled but not routed to a machine yet`

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
            dropping down the sheet once the figures arrive. A phone's drawer scrolls as one; a box
            scrolling inside it would fight the swipe. */}
        <div data-print-expand className='scrollport min-h-64 md:max-h-96 md:overflow-y-auto'>
          {isPending || !data ? (
            <Skeleton className='h-64' />
          ) : (
            <table className='w-full table-fixed border-separate border-spacing-y-1.5'>
              <colgroup>
                <col className='w-1/2' />
                <col />
                <col className='w-32 max-sm:w-20' />
              </colgroup>
              <tbody>
                <Card
                  tone='day'
                  title={unrouted ? unroutedNote : undefined}
                  name={
                    <Cap
                      heading={
                        <>
                          {formatLongDate(data.date)}
                          {data.date === today() ? (
                            <span className='font-normal text-muted-foreground'> · today</span>
                          ) : null}
                        </>
                      }
                      label={`${capLabel}:`}
                      cap={data.total.capacity}
                      used={data.total.used}
                      over={data.total.over_capacity}
                    />
                  }
                  measure={
                    <>
                      <Heading>{measure}</Heading>
                      <Progress
                        done={totalDone}
                        value={total}
                        fromStock={
                          feet ? data.total.linear_feet_from_stock : data.total.bends_from_stock
                        }
                        fromStockDone={
                          feet
                            ? data.total.linear_feet_from_stock_done
                            : data.total.bends_from_stock_done
                        }
                        unrouted={unrouted}
                      />
                    </>
                  }
                  pieces={
                    <>
                      <Heading>Pieces</Heading>
                      <Figure
                        value={data.total.pieces}
                        fromStock={data.total.pieces_from_stock}
                        unrouted={unrouted}
                      />
                    </>
                  }
                />

                {slinet ? (
                  <Card
                    tone='slinet'
                    name={
                      <Cap
                        heading={slinet.name ?? 'Slinet'}
                        label='Daily Piece Cap:'
                        cap={slinet.max_pieces}
                        used={slinet.pieces}
                        over={slinet.over_pieces}
                      />
                    }
                    measure={
                      <>
                        <Heading>Pieces</Heading>
                        <Progress
                          done={slinet.pieces_cut}
                          value={slinet.pieces}
                          fromStock={slinet.pieces_from_stock}
                          fromStockDone={slinet.pieces_cut_from_stock}
                        />
                      </>
                    }
                  />
                ) : null}

                <tr>
                  <th scope='col' className='px-3.5 pt-2 text-sm font-bold max-sm:px-2.5'>
                    <span className='flex flex-wrap justify-between gap-x-2 border-b border-foreground pb-0.5'>
                      Machine
                      <span className='pr-14 max-sm:pr-0'>{capLabel}</span>
                    </span>
                  </th>
                  <th scope='col' className='px-3.5 pt-2 align-bottom max-sm:px-2'>
                    <Heading>{measure}</Heading>
                  </th>
                  <th scope='col' className='px-3.5 pt-2 align-bottom max-sm:px-2'>
                    <Heading>Pieces</Heading>
                  </th>
                </tr>

                {makers.map(machine => {
                  const load = machineLoad(machine, unit)
                  return (
                    <Card
                      key={machine.flow_id}
                      tone='machine'
                      name={
                        <Cap
                          label={
                            <span className='font-semibold'>
                              {machine.name ?? `Machine ${machine.flow_id}`}
                            </span>
                          }
                          cap={load.max}
                          used={load.value}
                          over={load.over}
                        />
                      }
                      measure={
                        <Progress
                          done={load.done}
                          value={load.value}
                          fromStock={load.fromStock}
                          fromStockDone={load.fromStockDone}
                        />
                      }
                      pieces={
                        <Figure value={machine.pieces} fromStock={machine.pieces_from_stock} />
                      }
                    />
                  )
                })}

                {/* Venting is a Trim step; Rollforming's lines are never vented. */}
                {feet ? null : (
                  <Card
                    tone='vented'
                    name={<span className='text-sm font-semibold'>Vented</span>}
                    measure={null}
                    pieces={
                      <Figure
                        value={data.total.vented_pieces}
                        fromStock={data.total.vented_pieces_from_stock}
                      />
                    }
                  />
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* The day card's title says what is unrouted; a finger cannot hover for it. */}
        {data && unrouted ? (
          <p data-print-hide className='text-xs text-warning pointer-fine:hidden'>
            {unroutedNote}
          </p>
        ) : null}

        <div data-print-hide className='flex justify-center'>
          <Button
            className='max-md:w-full'
            disabled={isPending || !data}
            onClick={() => window.print()}
          >
            <Printer data-icon='inline-start' />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
