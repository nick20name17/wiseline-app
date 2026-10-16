import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { SelectionBar } from '@/components/selection-bar'
import { useActiveInView } from '@/hooks/use-active-in-view'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatLongDate } from '@/lib/days'
import { toggled } from '@/lib/sets'
import { toast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ArrowRight, CalendarDays, CalendarX2, Undo2, X } from 'lucide-react'
import { useState } from 'react'
import {
  isLoad,
  loadsQuery,
  useAddToLoad,
  useDeletePickup,
  useReleaseLoad,
  useRemoveFromLoad,
  useUnreleaseLoad,
  useUnschedule,
  type Assignment,
  type LoadTab,
  type TruckCard
} from '../api'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RowActions } from '@/components/row-actions'
import { formatWeight } from '../lib/format'
import { statusLabel } from '../lib/status'
import { OrderLine } from './load-card'
import { LoadRoute } from './load-route'
import { EditPickupDialog, PickupDialog } from './pickup-dialog'
import { ScheduleDialog } from './schedule-dialog'

// Orders go only on a Load not yet released to Loading; the server refuses the rest.
const takesOrders = (load: { status: string | null }) =>
  (load.status ?? 'unreleased') === 'unreleased'

// A release is taken back only while the Load is still at the warehouse; the server refuses it after.
const takesBackRelease = (load: { status: string | null }) =>
  load.status === 'not_started' || load.status === 'loading' || load.status === 'loaded'

// A day's first tab has no Load behind it until Add To Load makes one.
const tabKey = (load: LoadTab) => (load.load_id === null ? 'new' : String(load.load_id))

/** A supplier pickup's edit and delete, offered until its Load is released. */
const PickupActions = ({ pickup }: { pickup: Assignment }) => {
  const deletion = useDeletePickup()

  return (
    <RowActions
      name={`the pickup from ${pickup.customer ?? pickup.assignment_id}`}
      edit={dialog => <EditPickupDialog pickup={pickup} {...dialog} />}
      remove={{
        title: `Delete the pickup from ${pickup.customer ?? 'the supplier'}?`,
        description: 'The pickup comes off the truck and its Load. This cannot be undone.',
        isPending: deletion.isPending,
        onConfirm: () => deletion.mutateAsync(pickup.assignment_id)
      }}
    />
  )
}

type TruckLoadsProps = {
  card: TruckCard
  shipDate: string
}

/**
 * Under a truck: the orders not on a Load yet, ticked into the Load tab in view with Add To Load
 * p3 (591,357), and a tab per Load with its orders and Release To Loading p3 (598,468).
 */
export const TruckLoads = ({ card, shipDate }: TruckLoadsProps) => {
  const { data: loads, isPending } = useQuery(loadsQuery(card.truck_id, shipDate))
  const [tab, setTab] = useState<string | null>(null)
  const [picked, setPicked] = useState<Set<number>>(() => new Set())
  const [rescheduling, setRescheduling] = useState(false)
  const [unscheduling, setUnscheduling] = useState(false)
  // What the question was about, kept as asked: the ticks clear while it is still closing.
  const [asked, setAsked] = useState({ orders: [] as string[], pickups: false })
  const add = useAddToLoad()
  const remove = useRemoveFromLoad()
  const release = useReleaseLoad()
  const unrelease = useUnreleaseLoad()
  // The Load asked about, not a flag: a Load that leaves the warehouse mid-question must not hand the
  // open confirm on to the next Load shown.
  const [unreleasing, setUnreleasing] = useState<number | null>(null)

  const waiting = card.orders.filter(order => order.load_id === null)
  const current =
    loads?.find(load => tabKey(load) === tab) ?? loads?.find(takesOrders) ?? loads?.[0] ?? null
  const all = waiting.length > 0 && waiting.every(order => picked.has(order.assignment_id))
  const chosen = waiting.filter(order => picked.has(order.assignment_id))
  const selectedWeight = chosen.reduce((total, order) => total + order.weight, 0)
  // A pickup has no Unscheduled to go back to: it is deleted from its row instead.
  const deliveries = chosen.flatMap(order =>
    order.kind === 'delivery' && order.order ? [order.order] : []
  )
  const unschedule = useUnschedule(() => {
    setUnscheduling(false)
    setPicked(new Set())
  })
  const strip = useActiveInView<HTMLDivElement>(current ? tabKey(current) : null)

  if (isPending) return <Skeleton className='h-24' />

  return (
    <div className='flex flex-col gap-3 border-t border-border bg-muted/30 p-3'>
      {/* A phone's thumb finds a full-width button where a desk's eye finds the corner. */}
      <div className='flex justify-end max-md:*:flex-1'>
        <PickupDialog card={card} shipDate={shipDate} />
      </div>

      {waiting.length ? (
        <section className='rounded-lg border border-border bg-card'>
          <div className='flex flex-wrap items-center gap-3 px-3 py-2'>
            {/* «Select All … the order that have not been assigned to a load» p3 (594,325). */}
            <Checkbox
              aria-label={`Select every order on truck ${card.name} not on a Load`}
              checked={all}
              onCheckedChange={() =>
                setPicked(all ? new Set() : new Set(waiting.map(order => order.assignment_id)))
              }
            />
            <span className='text-sm font-medium'>Not on a Load</span>
            <span className='text-sm text-muted-foreground'>
              Selected {formatWeight(selectedWeight)}
            </span>
            <div className='ml-auto flex max-md:w-full'>
              <SelectionBar
                active={chosen.length > 0}
                note={
                  chosen.length > 0 && current && !takesOrders(current)
                    ? `${current.name} is released; open another Load to add to.`
                    : null
                }
              >
                {/* Another day or truck for what is not on a Load yet p3 (591,341). */}
                <Button
                  variant='outline'
                  disabled={!chosen.length}
                  onClick={() => setRescheduling(true)}
                >
                  <CalendarDays data-icon='inline-start' />
                  Reschedule
                </Button>
                <Button
                  variant='outline'
                  disabled={!deliveries.length}
                  onClick={() => {
                    setAsked({ orders: deliveries, pickups: deliveries.length < chosen.length })
                    setUnscheduling(true)
                  }}
                >
                  <CalendarX2 data-icon='inline-start' />
                  Unschedule
                </Button>
                <Button
                  disabled={!chosen.length || !current || !takesOrders(current) || add.isPending}
                  onClick={() =>
                    current &&
                    add.mutate(
                      {
                        assignmentIds: chosen.map(order => order.assignment_id),
                        loadId: current.load_id
                      },
                      { onSuccess: () => setPicked(new Set()) }
                    )
                  }
                >
                  {add.isPending ? <Spinner data-icon='inline-start' /> : null}
                  Add to {current?.name ?? 'Load'}
                </Button>
              </SelectionBar>
            </div>
          </div>
          <ul>
            {waiting.map(order => (
              <OrderLine
                key={order.assignment_id}
                order={order}
                lead={
                  <Checkbox
                    aria-label={
                      order.kind === 'pickup'
                        ? `Select the pickup from ${order.customer ?? order.assignment_id}`
                        : `Select order ${order.order_number ?? order.assignment_id}`
                    }
                    checked={picked.has(order.assignment_id)}
                    onCheckedChange={() => setPicked(set => toggled(set, order.assignment_id))}
                  />
                }
                trail={order.kind === 'pickup' ? <PickupActions pickup={order} /> : null}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {loads?.length ? (
        <section className='rounded-lg border border-border bg-card'>
          <Tabs
            value={current ? tabKey(current) : null}
            onValueChange={value => setTab(String(value))}
          >
            {/* A truck's Loads run past a phone's width, so the strip swipes. */}
            <div ref={strip} className='scrollbar-none overflow-x-auto px-3'>
              <TabsList variant='line'>
                {loads.map(load => (
                  <TabsTrigger
                    key={tabKey(load)}
                    value={tabKey(load)}
                    title={load.is_overdue ? 'Overdue' : undefined}
                  >
                    <span className={cn(load.is_overdue && 'text-destructive')}>{load.name}</span>
                    <span className='ml-1 font-mono text-xs text-muted-foreground'>
                      {formatWeight(load.weight)}
                    </span>
                    {load.status ? (
                      <span className='ml-1 text-xs text-muted-foreground'>
                        · {statusLabel(load.status)}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          {current ? (
            <>
              {current.orders.length ? (
                <ul>
                  {current.orders.map(order => (
                    <OrderLine
                      key={order.assignment_id}
                      order={order}
                      lead={
                        <span className='w-10 font-mono text-xs text-muted-foreground'>
                          {current.marker}
                        </span>
                      }
                      trail={
                        order.kind === 'pickup' && takesOrders(current) ? (
                          <PickupActions pickup={order} />
                        ) : null
                      }
                    />
                  ))}
                </ul>
              ) : (
                <p className='px-3 py-4 text-sm text-muted-foreground'>
                  Tick orders above and add them to {current.name}.
                </p>
              )}
              {isLoad(current) && current.orders.length ? <LoadRoute load={current} /> : null}
              {isLoad(current) && current.orders.length && takesOrders(current) ? (
                <div className='flex flex-wrap justify-end gap-2 border-t border-border px-3 py-2'>
                  <Button
                    variant='outline'
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(current.orders.map(order => order.assignment_id))}
                  >
                    <X data-icon='inline-start' />
                    Take all off {current.name}
                  </Button>
                  <Button
                    disabled={release.isPending}
                    onClick={() => release.mutate(current.load_id)}
                  >
                    {release.isPending ? (
                      <Spinner data-icon='inline-start' />
                    ) : (
                      <ArrowRight data-icon='inline-start' />
                    )}
                    Release to Loading
                  </Button>
                </div>
              ) : null}
              {isLoad(current) && takesBackRelease(current) ? (
                <div className='flex justify-end border-t border-border px-3 py-2 max-md:*:flex-1'>
                  <Button variant='outline' onClick={() => setUnreleasing(current.load_id)}>
                    <Undo2 data-icon='inline-start' />
                    Unrelease {current.name}
                  </Button>
                  <ConfirmDialog
                    open={unreleasing === current.load_id}
                    onOpenChange={open => setUnreleasing(open ? current.load_id : null)}
                    title={`Unrelease ${current.name}?`}
                    description={`${current.name} leaves Loading and can be changed again. Every package ticked onto the truck comes off it and has to be loaded again.`}
                    confirmLabel={`Yes, Unrelease ${current.name}`}
                    isPending={unrelease.isPending}
                    onConfirm={() =>
                      unrelease.mutate(current.load_id, { onSuccess: () => setUnreleasing(null) })
                    }
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      <ConfirmDialog
        open={unscheduling}
        onOpenChange={setUnscheduling}
        title={
          asked.orders.length === 1
            ? 'Unschedule 1 order?'
            : `Unschedule ${asked.orders.length} orders?`
        }
        description={
          'They go back to the Unscheduled tab. Their Ship Date in EBMS stays as it is.' +
          (asked.pickups ? ' The ticked pickups stay on the truck.' : '')
        }
        confirmLabel='Yes, Unschedule'
        isPending={unschedule.isPending}
        onConfirm={() => unschedule.mutate(asked.orders)}
      />

      <ScheduleDialog
        verb='Reschedule'
        selection={{
          orders: deliveries,
          pickupIds: chosen.flatMap(order => (order.kind === 'pickup' ? [order.assignment_id] : []))
        }}
        open={rescheduling}
        onOpenChange={setRescheduling}
        onApplied={day => {
          setPicked(new Set())
          toast.add({ type: 'success', title: `Rescheduled to ${formatLongDate(day)}` })
        }}
      />
    </div>
  )
}
