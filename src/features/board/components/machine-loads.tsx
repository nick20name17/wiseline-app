import { Skeleton } from '@/components/ui/skeleton'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { isMaker, machineCapacitiesQuery, machineLoad, machinesQuery } from '../api'
import { formatCount as count, loadUnit, share } from '../lib/format'
import { Bar } from './capacity-parts'

type MachineLoadsProps = {
  /** The board's name, which its machines are listed under. */
  category: string
  departmentId: number | undefined
  day: string
}

const PLACEHOLDER_CARDS = 5

// A card, loaded or not: the strip keeps its height while a day's loads are on their way.
const CARD =
  'flex h-12.5 w-48 flex-col justify-center gap-1 rounded-lg border border-border bg-card px-3'

/**
 * Each machine's load on the day, «140 / 300» and how full, refreshed as lines are put on machines:
 * a machine filling up shows while it is being assigned, not only in the report the day tab opens.
 * The Slinet and Wrapping are not assigned to, so they have no bar here.
 */
export const MachineLoads = ({ category, departmentId, day }: MachineLoadsProps) => {
  // Another day's loads stay up, dimmed, until this day's are in, rather than the strip folding away
  // and dropping everything under it for a moment.
  const { data, isPlaceholderData } = useQuery({
    ...machineCapacitiesQuery(departmentId, day),
    placeholderData: keepPreviousData
  })
  const { data: machines } = useQuery(machinesQuery(category, departmentId))

  if (!data) {
    // As many cards as the board's machines, or a row of them while those are on their way too.
    const expected = machines ? machines.filter(isMaker).length : PLACEHOLDER_CARDS
    return expected ? (
      <ul aria-label='Machine loads' aria-busy className='flex flex-wrap gap-2'>
        {Array.from({ length: expected }, (_, card) => (
          <li key={card} className={CARD}>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-2 w-full' />
          </li>
        ))}
      </ul>
    ) : null
  }

  const unit = data.total.capacity_unit
  const makers = data.machines.filter(isMaker)
  if (!makers.length) return null

  return (
    <ul
      aria-label='Machine loads'
      aria-busy={isPlaceholderData}
      className={cn('flex flex-wrap gap-2 transition-opacity', isPlaceholderData && 'opacity-50')}
    >
      {makers.map(machine => {
        const load = machineLoad(machine, unit)
        const percent = share(load.value, load.max)
        const name = machine.name ?? `Machine ${machine.flow_id}`
        return (
          <li
            key={machine.flow_id}
            className={CARD}
            title={
              load.max
                ? `${count(load.value)} of ${count(load.max)} ${loadUnit(unit)} assigned${load.over ? ' — over the daily max' : ''}`
                : `${count(load.value)} ${loadUnit(unit)} assigned · no daily max`
            }
          >
            <span className='flex items-baseline gap-2 text-sm'>
              <span className='min-w-0 flex-1 truncate font-medium'>{name}</span>
              <span className={cn('font-mono text-xs', load.over && 'text-destructive')}>
                {count(load.value)}
                {load.max ? ` / ${count(load.max)}` : ''}
              </span>
              {percent === null ? null : (
                <span
                  className={cn('font-mono text-xs font-bold', load.over && 'text-destructive')}
                >
                  {percent}%
                </span>
              )}
            </span>
            <Bar percent={percent} over={load.over} />
          </li>
        )
      })}
    </ul>
  )
}
