import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { isMaker, machineCapacitiesQuery, machineLoad } from '../api'
import { formatCount as count, loadUnit, share } from '../lib/format'
import { Bar } from './capacity-parts'

type MachineLoadsProps = {
  departmentId: number | undefined
  day: string
}

/**
 * Each machine's load on the day, «140 / 300» and how full, refreshed as lines are put on machines:
 * a machine filling up shows while it is being assigned, not only in the report the day tab opens.
 * The Slinet and Wrapping are not assigned to, so they have no bar here.
 */
export const MachineLoads = ({ departmentId, day }: MachineLoadsProps) => {
  const { data } = useQuery(machineCapacitiesQuery(departmentId, day))
  if (!data) return null

  const unit = data.total.capacity_unit
  const makers = data.machines.filter(isMaker)
  if (!makers.length) return null

  return (
    <ul aria-label='Machine loads' className='flex flex-wrap gap-2'>
      {makers.map(machine => {
        const load = machineLoad(machine, unit)
        const percent = share(load.value, load.max)
        const name = machine.name ?? `Machine ${machine.flow_id}`
        return (
          <li
            key={machine.flow_id}
            className='flex w-48 flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2'
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
