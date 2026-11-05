import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from 'cn'
import { Warehouse } from 'lucide-react'
import { useState, type ComponentProps, type ReactNode } from 'react'
import {
  locationColumns,
  locationWarehouses,
  openingWarehouse,
  type GridSlot
} from '../lib/location-grid'

// A tab's value is a string; a location in no warehouse still gets a tab of its own.
const tabOf = (warehouse: number | null) => (warehouse === null ? 'none' : String(warehouse))

type LocationGridProps<T extends GridSlot> = {
  slots: T[] | undefined
  isPending: boolean
  /** The department's own default warehouse, which the grid opens on. */
  departmentDefault: number | null
  renderSlot: (slot: T) => ReactNode
}

/**
 * The body of a location picker: a tab per warehouse, opening on the department's default, and in it
 * every location at once, a column per location type in its Settings order, so the Worker scans for
 * a free one rather than paging through types (Kevin's notes of 2026-11-02, N10). Key it by
 * department so each opens on its own default.
 */
export const LocationGrid = <T extends GridSlot>({
  slots,
  isPending,
  departmentDefault,
  renderSlot
}: LocationGridProps<T>) => {
  const [chosen, setChosen] = useState<string | null>(null)
  const warehouses = locationWarehouses(slots ?? [])
  const warehouse = warehouses.some(option => tabOf(option.id) === chosen)
    ? chosen
    : tabOf(openingWarehouse(warehouses, departmentDefault))
  const columns = locationColumns(
    (slots ?? []).filter(slot => tabOf(slot.warehouse_id) === warehouse)
  )

  return (
    <>
      {warehouses.length ? (
        <Tabs value={warehouse} onValueChange={value => setChosen(String(value))}>
          <div className='overflow-x-auto max-md:scrollbar-none'>
            <TabsList aria-label='Warehouse'>
              {warehouses.map(option => (
                <TabsTrigger key={tabOf(option.id)} value={tabOf(option.id)}>
                  {option.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      ) : null}

      {/* A phone's drawer scrolls as one, its columns stacked; a box scrolling inside it would
          fight the swipe. */}
      <div data-dialog-grow className='scrollport min-h-56 md:max-h-120 md:overflow-auto'>
        {isPending ? (
          <Skeleton className='h-56' />
        ) : columns.length ? (
          <div className='flex flex-col gap-4 md:flex-row md:gap-3'>
            {columns.map(column => (
              <section
                key={column.key}
                className='flex min-w-0 flex-col gap-1.5 md:flex-1 md:shrink-0 md:basis-44'
              >
                {/* Stays over its rows while a long column scrolls. */}
                <h3 className='sticky top-0 z-10 truncate bg-popover pb-1 text-xs font-semibold tracking-wider uppercase'>
                  {column.name}
                </h3>
                {column.slots.map(renderSlot)}
              </section>
            ))}
          </div>
        ) : (
          <Empty className='min-h-56'>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <Warehouse />
              </EmptyMedia>
              <EmptyTitle>No locations</EmptyTitle>
              <EmptyDescription>
                Locations are set up in Settings, under the department they belong to.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </>
  )
}

type LocationButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  code: ReactNode
  detail?: ReactNode
}

/** One location of the grid: its code, and what stands on it beside. */
export const LocationButton = ({ code, detail, className, ...props }: LocationButtonProps) => (
  <button
    type='button'
    className={cn(
      'flex items-baseline justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left text-sm leading-tight hover:border-input disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground',
      className
    )}
    {...props}
  >
    <span className='truncate font-mono font-medium'>{code}</span>
    {detail ? <span className='shrink-0 text-xs opacity-75'>{detail}</span> : null}
  </button>
)
