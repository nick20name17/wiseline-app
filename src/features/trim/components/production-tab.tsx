import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, Database, History, Layers } from 'lucide-react'
import { useState } from 'react'
import {
  cutlistsQuery,
  machineCapacitiesQuery,
  machinesQuery,
  type Cutlist,
  type Machine
} from '../api'
import { byDay, type CutlistGroup } from '../lib/cutlists'
import { formatDate, today } from '../lib/format'
import { CutlistCard } from './cutlist-card'
import { CutlistCoilsDialog } from './cutlist-coils-dialog'
import { CutlistTotalDialog } from './cutlist-total-dialog'
import { WrappingTab } from './wrapping-tab'

// The station that cuts the material, and the one that comes after every machine has bent it.
const CUTTING = 'cutting'
const WRAPPING = 'wrapping'
const SLINET = 'slinet'

type TotalsProps = {
  departmentId: number | undefined
  machine: Machine | null
}

/**
 * What this station has in front of it today. The Slinet cuts rather than bends, so neither Total
 * Bends nor a daily max it has none of belongs on its strip.
 */
const Totals = ({ departmentId, machine }: TotalsProps) => {
  const day = today()
  const { data } = useQuery(machineCapacitiesQuery(departmentId, day))
  const station = machine ? data?.machines.find(row => row.flow_id === machine.id) : null
  const pieces = machine ? (station?.pieces ?? 0) : (data?.total.pieces ?? 0)

  return (
    <div className='flex flex-wrap items-center gap-6 rounded-lg border border-border bg-card px-4 py-3'>
      <span className='flex items-center gap-2 text-sm font-medium'>
        <CalendarCheck className='size-3.5' />
        {formatDate(day)}
        <span className='text-muted-foreground'>· today</span>
      </span>

      <span className='flex flex-col'>
        <span className='text-xs tracking-wider text-muted-foreground uppercase'>
          Total # Pieces
        </span>
        <span className='font-mono text-lg'>{pieces}</span>
      </span>

      {machine ? (
        <>
          <span className='flex flex-col'>
            <span className='text-xs tracking-wider text-muted-foreground uppercase'>
              Total Bends
            </span>
            <span
              className={
                station?.over_bends ? 'font-mono text-lg text-destructive' : 'font-mono text-lg'
              }
            >
              {station?.bends ?? 0}
            </span>
          </span>
          <span className='flex flex-col'>
            <span className='text-xs tracking-wider text-muted-foreground uppercase'>
              Daily Max (bends)
            </span>
            <span className='font-mono text-lg'>{station?.max_bends ?? '—'}</span>
          </span>
        </>
      ) : null}
    </div>
  )
}

type ProductionTabProps = {
  departmentId: number | undefined
  readOnly: boolean
  onOpenCoils: () => void
}

/**
 * The Production tab: one sub-tab per station, each holding the lists that release created for it.
 * The Slinet's cutlists cover every machine at once; a machine's bendlists are its own.
 */
export const ProductionTab = ({ departmentId, readOnly, onOpenCoils }: ProductionTabProps) => {
  const [station, setStation] = useState(SLINET)
  const [done, setDone] = useState(false)
  const [total, setTotal] = useState<CutlistGroup | null>(null)
  const [coils, setCoils] = useState<Cutlist | null>(null)

  const { data: machines } = useQuery(machinesQuery(departmentId))
  // The machines that bend: the cutter is the Slinet tab itself, and Wrapping is a station of its
  // own rather than a list of bends.
  const benders =
    machines?.filter(machine => machine.kind !== CUTTING && machine.kind !== WRAPPING) ?? []
  const wrapping = machines?.find(machine => machine.kind === WRAPPING)
  const isWrapping = station === WRAPPING
  const isSlinet = station === SLINET
  const activeMachine = isSlinet ? null : (benders.find(m => String(m.id) === station) ?? null)

  const { data: cutlists, isPending } = useQuery({
    ...cutlistsQuery(
      departmentId,
      isSlinet ? 'cutlist' : 'bendlist',
      activeMachine?.id ?? null,
      done
    ),
    // Wrapping keeps no lists of its own; it reads the line items straight.
    enabled: departmentId !== undefined && !isWrapping
  })
  const word = isSlinet ? 'cutlists' : 'bendlists'
  const days = byDay(cutlists ?? [])

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-3 border-b border-border'>
        <Tabs className='min-w-0 flex-1' value={station} onValueChange={setStation}>
          {/* The scroll sits on a wrapper rather than on the list, so the first and last station
              keep their focus ring where the strip has to scroll. */}
          <div className='scrollport overflow-x-auto'>
            <TabsList variant='line' className='h-9'>
              <TabsTrigger value={SLINET}>Slinet</TabsTrigger>
              {benders.map(machine => (
                <TabsTrigger key={machine.id} value={String(machine.id)}>
                  {machine.name}
                </TabsTrigger>
              ))}
              {/* The terminal station: no lists, no Active/Completed switch, no capacity. */}
              {wrapping ? (
                <TabsTrigger value={WRAPPING}>{wrapping.name ?? 'Wrapping'}</TabsTrigger>
              ) : null}
            </TabsList>
          </div>
        </Tabs>

        {/* The worker reaches the coils from where he is standing — the same list the Coils tab
            shows, under the Manager's filter. */}
        <Button variant='outline' className='mb-1.5' onClick={onOpenCoils}>
          <Database data-icon='inline-start' />
          Coils
        </Button>
      </div>

      {isWrapping ? (
        <WrappingTab departmentId={departmentId} readOnly={readOnly} />
      ) : (
        <>
          {/* Every station carries its own Active / Completed switch, and a completed list renders in
          the format the worker used — same card, same columns. */}
          <Tabs value={done ? 'done' : 'active'} onValueChange={value => setDone(value === 'done')}>
            <TabsList className='h-10'>
              <TabsTrigger value='active'>Active {word}</TabsTrigger>
              <TabsTrigger value='done'>
                <History data-icon='inline-start' />
                Completed {word} · past 90 days
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {done ? null : <Totals departmentId={departmentId} machine={activeMachine} />}

          {isPending ? (
            <div className='flex flex-col gap-3'>
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className='h-13' />
              ))}
            </div>
          ) : days.length ? (
            days.map(day => (
              <div key={day.date ?? 'undated'} className='flex flex-col gap-3'>
                {/* The date is said once, over the lists that share it, rather than on every card. */}
                <div className='flex items-center gap-3'>
                  <span className='text-xs font-semibold tracking-wider uppercase'>
                    {formatDate(day.date)}
                    {day.date === today() ? ' · today' : ''}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {day.cutlists.length} {day.cutlists.length === 1 ? word.slice(0, -1) : word}
                  </span>
                  <span className='h-px flex-1 bg-border' />
                </div>

                {day.cutlists.map(cutlist => (
                  <CutlistCard
                    key={cutlist.id}
                    cutlist={cutlist}
                    machines={benders}
                    isSlinet={isSlinet}
                    readOnly={readOnly}
                    onOpenTotal={setTotal}
                    onOpenCoils={setCoils}
                  />
                ))}
              </div>
            ))
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Layers />
                </EmptyMedia>
                <EmptyTitle>
                  {done
                    ? `No completed ${word}`
                    : `Nothing on ${activeMachine?.name ?? 'the Slinet'}`}
                </EmptyTitle>
                <EmptyDescription>
                  {done
                    ? 'Lists land here the moment this station marks them Done.'
                    : 'Release orders from the Scheduled tab. Lists appear here, grouped by production date, gauge/colour and priority.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <CutlistTotalDialog group={total} onOpenChange={open => !open && setTotal(null)} />
          <CutlistCoilsDialog cutlist={coils} onOpenChange={open => !open && setCoils(null)} />
        </>
      )}
    </div>
  )
}
