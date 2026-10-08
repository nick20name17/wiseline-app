import { dragAnnouncements, useDragSensors } from '@/components/table/drag'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { GripVertical, Map as MapIcon, RefreshCw, Route, Warehouse } from 'lucide-react'
import { useState } from 'react'
import { routeQuery, usePlanRoute, useReorderRoute, type Load, type Stop } from '../api'
import { routeUrl } from '../lib/format'

// Once the truck has left, the run is the Driver's and the order is history.
const ON_THE_ROAD = new Set(['en_route', 'delivered', 'completed'])

/** A customer's stop: saved once the route is planned, so it has an id to drag by. */
type Delivery = Stop & { route_id: number }

const isDelivery = (stop: Stop): stop is Delivery => !stop.dispatch_point && stop.route_id !== null

const place = (stop: Stop) => [stop.address, stop.city].filter(Boolean).join(', ') || '—'

type StopRowProps = { stop: Delivery; number: number; locked: boolean }

const StopRow = ({ stop, number, locked }: StopRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: stop.route_id, disabled: locked })

  return (
    <li
      ref={setNodeRef}
      // dnd-kit computes both every frame of a drag; no class can carry them.
      // oxlint-disable-next-line shadcn/no-inline-styles
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-state={isDragging ? 'selected' : undefined}
      className={cn(
        'flex items-center gap-3 border-t border-border bg-card px-3 py-2 text-sm data-[state=selected]:bg-muted',
        isDragging && 'relative z-10'
      )}
      {...listeners}
    >
      <button
        ref={setActivatorNodeRef}
        type='button'
        aria-label={`Move ${stop.order_number ?? stop.name ?? 'stop'}`}
        className='flex cursor-grab items-center rounded-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-default aria-disabled:opacity-50'
        {...attributes}
      >
        <GripVertical className='size-3.5' />
      </button>
      <span className='w-6 font-mono text-muted-foreground'>{number}</span>
      <span className='w-28 font-mono font-medium'>{stop.order_number ?? '—'}</span>
      <span className='min-w-0 flex-1 truncate'>{stop.name ?? '—'}</span>
      <span className='min-w-0 flex-1 truncate text-muted-foreground'>{place(stop)}</span>
    </li>
  )
}

/**
 * A Load's run: the warehouse, then the deliveries in the order the Driver makes them, dragged up and
 * down to change it — «The sequence of these orders determines which order to deliver 1st, 2nd, 3rd»
 * p3 (617,441).
 */
export const LoadRoute = ({ load }: { load: Load }) => {
  const { data: stops, isPending } = useQuery(routeQuery(load.load_id))
  const plan = usePlanRoute()
  const reorder = useReorderRoute()
  const sensors = useDragSensors()
  // The order a drop left, held until the save settles so the rows do not flash back first.
  const [dropped, setDropped] = useState<Delivery[] | null>(null)
  const locked = ON_THE_ROAD.has(load.status ?? '')

  if (isPending) return <Skeleton className='h-16' />

  const all = stops ?? []
  // The warehouse comes first whether or not the route was planned — unsaved until it is, and never
  // dragged: the run starts there.
  const start = all.filter(stop => stop.dispatch_point)
  const deliveries = dropped ?? all.filter(isDelivery)
  const planned = all.some(stop => stop.route_id !== null)
  // A route planned before orders came on or off the Load no longer covers them.
  const ordersOnLoad = load.orders.filter(order => order.kind === 'delivery').length
  const stale = planned && deliveries.length !== ordersOnLoad
  const map = routeUrl([...start, ...deliveries])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = deliveries.findIndex(stop => stop.route_id === active.id)
    const to = deliveries.findIndex(stop => stop.route_id === over.id)
    const next = arrayMove(deliveries, from, to)
    setDropped(next)
    reorder.mutate(
      { loadId: load.load_id, routeIds: next.map(stop => stop.route_id) },
      { onSettled: () => setDropped(null) }
    )
  }

  return (
    <section aria-label={`Delivery route of ${load.name}`} className='border-t border-border'>
      <div className='flex flex-wrap items-center gap-2 px-3 py-2'>
        <Route className='size-4 text-muted-foreground' />
        <span className='text-sm font-medium'>Delivery route</span>
        {stale ? (
          <span className='text-xs text-warning'>The Load's orders have changed since</span>
        ) : null}
        <span className='ml-auto flex gap-2'>
          {map ? (
            <a
              href={map}
              target='_blank'
              rel='noreferrer'
              aria-label={`View the route of ${load.name} on the map`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <MapIcon data-icon='inline-start' />
              View on map
            </a>
          ) : null}
          {locked ? null : (
            <Button
              variant={planned ? 'outline' : 'default'}
              disabled={plan.isPending}
              onClick={() => plan.mutate({ loadId: load.load_id, rebuild: planned })}
            >
              {plan.isPending ? (
                <Spinner data-icon='inline-start' />
              ) : (
                <RefreshCw data-icon='inline-start' />
              )}
              {planned ? 'Rebuild route' : 'Plan route'}
            </Button>
          )}
        </span>
      </div>

      {all.length ? (
        <ol>
          {start.map(stop => (
            <li
              key={stop.route_id ?? 'warehouse'}
              className='flex items-center gap-3 border-t border-border px-3 py-2 text-sm text-muted-foreground'
            >
              <Warehouse className='size-3.5' />
              <span className='w-6' />
              <span className='min-w-0 flex-1 truncate'>{stop.name ?? 'Warehouse'}</span>
              <span className='min-w-0 flex-1 truncate'>{place(stop)}</span>
            </li>
          ))}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            accessibility={{
              announcements: dragAnnouncements({
                name: id =>
                  deliveries.find(stop => stop.route_id === id)?.order_number ?? undefined,
                place: id =>
                  `${deliveries.findIndex(stop => stop.route_id === id) + 1} of ${deliveries.length}`,
                area: 'the route'
              })
            }}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={deliveries.map(stop => stop.route_id)}
              strategy={verticalListSortingStrategy}
            >
              {deliveries.map((stop, index) => (
                <StopRow key={stop.route_id} stop={stop} number={index + 1} locked={locked} />
              ))}
            </SortableContext>
          </DndContext>
        </ol>
      ) : null}
    </section>
  )
}
