import { StickyTop } from './sticky-top'
import { useBoard, useViewOnly } from '../lib/board-context'
import { byDay, formatDate, today } from '@/lib/days'
import { QueryError } from '@/components/query-error'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, Database, Factory, History, Layers } from 'lucide-react'
import { useState } from 'react'
import {
  cutlistsQuery,
  machineCapacitiesQuery,
  machinesQuery,
  remanufacturingsQuery,
  wrappingRowsQuery,
  type Cutlist,
  type Machine,
  type Remanufacturing,
  type WrappingRow
} from '../api'
import {
  hasSlinetStarted,
  isBender,
  slinetListsFor,
  slinetTotals,
  type CutlistGroup
} from '../lib/cutlists'
import { SLINET, setDone, setStation, useProductionView } from '../lib/production-view'
import { Cap, Progress } from './capacity-parts'
import { CutlistCard } from './cutlist-card'
import { CutlistCoilsDialog } from './cutlist-coils-dialog'
import { CutlistTotalDialog } from './cutlist-total-dialog'
import { RemanufactureDialog } from './remanufacture-dialog'
import { ScanPackageDialog } from './scan-package-dialog'
import { StockManufacturingDialog } from './stock-manufacturing-dialog'
import { WrappingTab } from './wrapping-tab'

// The station that cuts the material, and the one that comes after every machine has bent it.
const CUTTING = 'cutting'
const WRAPPING = 'wrapping'

const NO_REMAKES: ReadonlyMap<number, Remanufacturing> = new Map()

const stockNote = (value: number) => (value ? ` (${value} of them from stock orders)` : '')

type TotalsProps = {
  departmentId: number | undefined
  machine: Machine | null
  /** The Slinet, whose Daily Piece Cap its strip reads against. */
  cutterId: number | undefined
  /** Every Slinet list, active and completed; only read on the Slinet's own strip. */
  slinetLists: Cutlist[]
}

/**
 * What this station has in front of it today, how much of it is done, and how full that makes its
 * day — what the capacity report says, where the station works. The Slinet cuts rather than bends,
 * so it counts pieces against its piece cap where a machine counts bends against its daily max.
 */
const Totals = ({ departmentId, machine, cutterId, slinetLists }: TotalsProps) => {
  const day = today()
  const { data } = useQuery(machineCapacitiesQuery(departmentId, day))
  const station = data?.machines.find(row => row.flow_id === (machine?.id ?? cutterId))
  // The capacity report counts everything scheduled for the day, routed or not; the Slinet cuts only
  // what has been released onto its lists.
  const slinet = slinetTotals(slinetLists, day)
  const pieces = machine ? (station?.pieces ?? 0) : slinet.pieces
  const where = machine ? 'Assigned to this machine for today' : 'Cut on the Slinet today'

  return (
    <div className='flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-border bg-card px-4 py-3'>
      <span className='flex items-center gap-2 text-sm font-medium'>
        <CalendarCheck className='size-3.5' />
        {formatDate(day)}
        <span className='text-muted-foreground'>· today</span>
      </span>

      <span className='flex flex-col'>
        <span className='text-xs tracking-wider text-muted-foreground uppercase'>
          Total # Pieces
        </span>
        <span
          className='font-mono text-lg'
          title={`${where}${stockNote(machine ? (station?.pieces_from_stock ?? 0) : slinet.stockPieces)}`}
        >
          {pieces}
        </span>
      </span>

      <span className='flex w-48 flex-col gap-1'>
        <span className='text-xs tracking-wider text-muted-foreground uppercase'>
          {machine ? 'Bends done' : 'Pieces cut'}
        </span>
        {machine ? (
          <Progress
            done={station?.bends_done ?? 0}
            value={station?.bends ?? 0}
            fromStock={station?.bends_from_stock ?? 0}
            fromStockDone={station?.bends_from_stock_done ?? 0}
          />
        ) : (
          <Progress
            done={slinet.cut}
            value={slinet.pieces}
            fromStock={slinet.stockPieces}
            fromStockDone={slinet.stockCut}
          />
        )}
      </span>

      <span className='w-56' title='Set in Settings › Machines'>
        {machine ? (
          <Cap
            label='Daily Max (bends)'
            cap={station?.max_bends}
            used={station?.bends ?? 0}
            over={!!station?.over_bends}
          />
        ) : (
          <Cap
            label='Daily Piece Cap'
            cap={station?.max_pieces}
            used={slinet.pieces}
            over={!!station?.max_pieces && slinet.pieces > station.max_pieces}
          />
        )}
      </span>
    </div>
  )
}

type ProductionTabProps = {
  /** The header search; only Wrapping reads it, the cutlists are the day's work as a whole. */
  search: string | undefined
  departmentId: number | undefined
  onOpenCoils: () => void
}

/**
 * The Production tab: one sub-tab per station, each holding the lists that release created for it.
 * The Slinet's cutlists cover every machine at once; a machine's bendlists are its own.
 */
export const ProductionTab = ({ search, departmentId, onOpenCoils }: ProductionTabProps) => {
  const view = useProductionView()
  const viewOnly = useViewOnly()
  const [total, setTotal] = useState<CutlistGroup | null>(null)
  const [manufacturing, setManufacturing] = useState(false)
  const [coils, setCoils] = useState<Cutlist | null>(null)
  const [remaking, setRemaking] = useState<WrappingRow | null>(null)

  const board = useBoard()
  const { data: machines } = useQuery(machinesQuery(board.name, departmentId))
  // The cutter is the Slinet tab itself, and Wrapping is a station of its own rather than a list of
  // bends.
  const benders = machines?.filter(isBender) ?? []
  const cutter = machines?.find(machine => machine.kind === CUTTING)
  const wrapping = machines?.find(machine => machine.kind === WRAPPING)

  const isWrapping = view.station === WRAPPING
  const activeMachine = benders.find(machine => String(machine.id) === view.station) ?? null
  // The remembered station may belong to a department whose machines are different.
  const known = !machines || view.station === SLINET || isWrapping || !!activeMachine
  const station = known ? view.station : SLINET
  const isSlinet = station === SLINET
  const done = view.done
  const stationName = activeMachine?.name ?? cutter?.name ?? 'Slinet'

  const lists = useQuery({
    ...cutlistsQuery(
      departmentId,
      isSlinet ? 'cutlist' : 'bendlist',
      activeMachine?.id ?? null,
      done
    ),
    // Wrapping keeps no lists of its own; it reads the line items straight.
    enabled: departmentId !== undefined && !isWrapping && (isSlinet || !!activeMachine)
  })
  // The Slinet's lists are what every other station reads its progress from: a bendlist is «in
  // progress», and its rows can be completed, once they have started on its release. The completed
  // ones count too — a list marked Done has cut everything on it.
  const { data: slinetActive } = useQuery({
    ...cutlistsQuery(departmentId, 'cutlist', null, false),
    enabled: departmentId !== undefined && !isWrapping
  })
  const { data: slinetDone } = useQuery({
    ...cutlistsQuery(departmentId, 'cutlist', null, true),
    enabled: departmentId !== undefined && !isWrapping
  })
  // Done first: while the two caches disagree over a list that has just been finished, its Done copy
  // is the one that says what has been cut.
  const slinetLists = [...(slinetDone ?? []), ...(slinetActive ?? [])]
  const slinetListFor = slinetListsFor(slinetLists)
  const slinetLoaded = !!slinetActive && !!slinetDone
  // The line behind a bendlist row, which is what a remanufacture is asked against.
  const { data: released } = useQuery({
    ...wrappingRowsQuery(departmentId, null),
    enabled: departmentId !== undefined && !!activeMachine
  })
  const lines = new Map(released?.map(line => [line.origin_item, line]))
  // A remake's list, row or riding bend row names the request; the request says how far it has got.
  const { data: remakes = NO_REMAKES } = useQuery({
    ...remanufacturingsQuery(departmentId),
    select: page => new Map(page.results.map(reman => [reman.id, reman]))
  })

  const word = isSlinet ? 'cutlists' : 'bendlists'
  // Production date, then priority, then gauge/colour.
  const days = byDay(lists.data ?? [], cutlist => cutlist.production_date)
  // Every release starts on the Slinet, so no Slinet list at all means nothing was ever released.
  const nothingReleased = slinetLoaded && !slinetLists.length

  const body = () => {
    if (lists.isError)
      return (
        <QueryError
          title={`The ${word} did not load`}
          error={lists.error}
          onRetry={() => void lists.refetch()}
        />
      )

    if (lists.isPending)
      return (
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className='h-13' />
          ))}
        </div>
      )

    if (!days.length)
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Layers />
            </EmptyMedia>
            <EmptyTitle>
              {nothingReleased
                ? 'No production batches yet'
                : done
                  ? `No completed ${word} on ${stationName}`
                  : `Nothing on ${stationName}`}
            </EmptyTitle>
            <EmptyDescription>
              {nothingReleased
                ? 'Release orders from the Scheduled tab. Cutlists & bendlists appear here, grouped by date × gauge/colour × priority.'
                : done
                  ? 'Lists land here the moment this station marks them Done — no wait on wrapping.'
                  : 'No released line items are routed here yet.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )

    return days.map(day => (
      <div key={day.date ?? 'undated'} className='flex flex-col gap-3'>
        {/* The date is said once, over the lists that share it, rather than on every card. */}
        <div className='flex items-center gap-3'>
          <span className='text-xs font-semibold tracking-wider uppercase'>
            {formatDate(day.date)}
            {day.date === today() ? ' · today' : ''}
          </span>
          <span className='text-xs text-muted-foreground'>
            {day.items.length} {day.items.length === 1 ? word.slice(0, -1) : word}
          </span>
          <span className='h-px flex-1 bg-border' />
        </div>

        {day.items.map(cutlist => {
          const slinetList = isSlinet ? undefined : slinetListFor(cutlist)
          return (
            <CutlistCard
              key={cutlist.id}
              cutlist={cutlist}
              remakes={remakes}
              machines={benders}
              isSlinet={isSlinet}
              slinetStarted={!isSlinet && hasSlinetStarted(slinetList, slinetLoaded)}
              lines={lines}
              onOpenTotal={setTotal}
              onOpenCoils={setCoils}
              onRemanufacture={setRemaking}
            />
          )
        })}
      </div>
    ))
  }

  return (
    <div className='flex flex-1 flex-col gap-3'>
      <StickyTop>
        {/* On a phone the buttons share a row of their own above the stations, in equal parts, so the
          strip keeps the whole width and still sits on the rule. */}
        <div className='flex items-center gap-3 border-b border-border max-md:flex-wrap'>
          <Tabs
            className='min-w-0 flex-1 max-md:order-last max-md:basis-full'
            value={station}
            onValueChange={setStation}
          >
            {/* The scroll sits on a wrapper rather than on the list, so the first and last station
              keep their focus ring where the strip has to scroll. */}
            <div className='scrollport overflow-x-auto max-md:scrollbar-none'>
              <TabsList variant='line' className='h-9'>
                {/* The gateway every list passes through first, set apart from the machines after it. */}
                <TabsTrigger value={SLINET} tone='gateway'>
                  Slinet
                </TabsTrigger>
                {benders.map(machine => (
                  <TabsTrigger key={machine.id} value={String(machine.id)}>
                    {machine.name}
                  </TabsTrigger>
                ))}
                {/* The terminal station: no lists, no Active/Completed switch, no capacity. It is
                  always there — every order ends at it, whether or not a machine is listed for it. */}
                <TabsTrigger value={WRAPPING}>{wrapping?.name ?? 'Wrapping'}</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          <div className='flex gap-2 max-md:w-full md:contents'>
            {/* p1 (1004,289): on every station, for pieces made against no order. */}
            {viewOnly ? null : (
              <Button
                variant='outline'
                className='max-md:flex-1 md:mb-1.5'
                onClick={() => setManufacturing(true)}
              >
                <Factory data-icon='inline-start' />
                <span className='md:hidden'>Stock Mfg</span>
                <span className='max-md:hidden'>Stock Manufacturing</span>
              </Button>
            )}

            {isWrapping && !viewOnly ? (
              <ScanPackageDialog className='max-md:flex-1 md:mb-1.5' />
            ) : null}

            {/* The worker reaches the coils from where he is standing — the same list the Coils tab
              shows, under the Manager's filter. */}
            <Button variant='outline' className='max-md:flex-1 md:mb-1.5' onClick={onOpenCoils}>
              <Database data-icon='inline-start' />
              Coils
            </Button>
          </div>
        </div>

        {isWrapping ? null : (
          <>
            {/* Every station carries its own Active / Completed switch, and a completed list renders in
          the format the worker used — same card, same columns. */}
            <Tabs
              value={done ? 'done' : 'active'}
              onValueChange={value => setDone(value === 'done')}
            >
              <TabsList className='h-10 max-md:w-full'>
                <TabsTrigger value='active'>Active {word}</TabsTrigger>
                <TabsTrigger value='done'>
                  <History data-icon='inline-start' />
                  Completed {word}
                  <span className='max-md:hidden'> · past 90 days</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {done ? null : (
              <Totals
                departmentId={departmentId}
                machine={activeMachine}
                cutterId={cutter?.id}
                slinetLists={slinetLists}
              />
            )}
          </>
        )}
      </StickyTop>

      {isWrapping ? (
        <WrappingTab search={search} departmentId={departmentId} />
      ) : (
        <>
          {body()}

          <CutlistTotalDialog group={total} onOpenChange={open => !open && setTotal(null)} />
          <CutlistCoilsDialog cutlist={coils} onOpenChange={open => !open && setCoils(null)} />
          <RemanufactureDialog
            departmentId={departmentId}
            line={remaking}
            source='machine'
            onOpenChange={open => !open && setRemaking(null)}
          />
        </>
      )}

      <StockManufacturingDialog
        departmentId={departmentId}
        open={manufacturing}
        onOpenChange={setManufacturing}
      />
    </div>
  )
}
