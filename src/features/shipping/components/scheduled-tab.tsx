import { QueryError } from '@/components/query-error'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLongDate, fromIsoDay, toIsoDay } from '@/lib/days'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { addDays } from 'date-fns'
import { ChevronDown, ChevronLeft, ChevronRight, Truck } from 'lucide-react'
import { useState } from 'react'
import { scheduledQuery, type TruckCard } from '../api'
import { formatWeight } from '../lib/format'
import { TruckLoads } from './truck-loads'

type Tile = { label: string; count: number; weight: number; tone: 'plain' | 'over' | 'done' }

/** One of a truck card's four boxes p3 (616,310)-(617,317). */
const Box = ({ tile }: { tile: Tile }) => (
  <span
    className={cn(
      'rounded-md border border-border px-2 py-1 text-xs',
      tile.tone === 'over' && 'border-warning bg-warning/15 text-warning',
      tile.tone === 'done' && 'border-success bg-success/10 text-success'
    )}
  >
    <span className='block text-muted-foreground'>{tile.label}</span>
    <span className='font-mono'>
      {tile.count} · {formatWeight(tile.weight)}
    </span>
  </span>
)

const tilesOf = (card: TruckCard): Tile[] => [
  {
    label: 'Delivery orders',
    count: card.delivery.count,
    weight: card.delivery.total_weight,
    tone: card.delivery.over_weight_limit ? 'over' : 'plain'
  },
  {
    label: 'Pickups',
    count: card.pickup.count,
    weight: card.pickup.total_weight,
    tone: card.pickup.over_weight_limit ? 'over' : 'plain'
  },
  // Green once everything is on a Load p3 (617,317).
  {
    label: 'Deliveries not on a Load',
    count: card.delivery.unassigned_count,
    weight: card.delivery.unassigned_weight,
    tone: card.delivery.count && card.delivery.all_assigned ? 'done' : 'plain'
  },
  {
    label: 'Pickups not on a Load',
    count: card.pickup.unassigned_count,
    weight: card.pickup.unassigned_weight,
    tone: card.pickup.count && card.pickup.all_assigned ? 'done' : 'plain'
  }
]

type ScheduledTabProps = {
  day: string
  onDayChange: (day: string) => void
}

/** «Choose the day you want to work on» p3 (616,306), then a card for each truck p3 (594,308). */
export const ScheduledTab = ({ day, onDayChange }: ScheduledTabProps) => {
  const { data: cards, isPending, isError, error, refetch } = useQuery(scheduledQuery(day))
  const [open, setOpen] = useState<number | null>(null)
  const step = (days: number) => onDayChange(toIsoDay(addDays(fromIsoDay(day), days)))
  const used = (cards ?? []).filter(card => card.orders.length)

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-3.5'>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='icon' aria-label='Previous day' onClick={() => step(-1)}>
          <ChevronLeft />
        </Button>
        <DatePicker
          value={fromIsoDay(day)}
          onChange={date => onDayChange(toIsoDay(date))}
          format={date => formatLongDate(toIsoDay(date))}
        />
        <Button variant='outline' size='icon' aria-label='Next day' onClick={() => step(1)}>
          <ChevronRight />
        </Button>
      </div>

      {isError && !cards ? (
        <QueryError title='The trucks did not load' error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className='h-40' />
      ) : !used.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Truck />
            </EmptyMedia>
            <EmptyTitle>Nothing ships {formatLongDate(day)}</EmptyTitle>
            <EmptyDescription>
              Schedule orders from the Unscheduled tab onto a truck.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        used.map(card => (
          <section
            key={card.truck_id}
            className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'
          >
            <button
              type='button'
              aria-expanded={open === card.truck_id}
              aria-label={`Truck ${card.name}`}
              className='flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40'
              onClick={() => setOpen(open === card.truck_id ? null : card.truck_id)}
            >
              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform',
                  open === card.truck_id || '-rotate-90'
                )}
              />
              <span className='font-medium'>Truck {card.name}</span>
              <span className='text-sm text-muted-foreground'>
                Limit {card.weight_limit === null ? '—' : formatWeight(card.weight_limit)}
              </span>
              <span className='ml-auto flex flex-wrap gap-2'>
                {tilesOf(card).map(tile => (
                  <Box key={tile.label} tile={tile} />
                ))}
              </span>
            </button>
            {open === card.truck_id ? <TruckLoads card={card} shipDate={day} /> : null}
          </section>
        ))
      )}
    </div>
  )
}
