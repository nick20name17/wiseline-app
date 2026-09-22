import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Warehouse } from 'lucide-react'
import { wrappingLocationsQuery, type LocationSlot } from '../api'

type LocationDialogProps = {
  departmentId: number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (location: LocationSlot) => void
}

/**
 * Select Location: where the package about to be made will stand. A full location is shown and shut
 * rather than hidden — the Worker is looking for a place he can see from the floor.
 */
export const LocationDialog = ({
  departmentId,
  open,
  onOpenChange,
  onPick
}: LocationDialogProps) => {
  const { data: slots, isPending } = useQuery(wrappingLocationsQuery(departmentId, open))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Select location</DialogTitle>
          <DialogDescription>
            Where this package goes. A location that is full, or already holds as many orders as it
            takes, cannot be picked.
          </DialogDescription>
        </DialogHeader>

        <div className='scrollport max-h-96 min-h-56 overflow-y-auto'>
          {isPending ? (
            <Skeleton className='h-56' />
          ) : slots?.length ? (
            <div className='grid gap-2 sm:grid-cols-3'>
              {slots.map(slot => (
                <button
                  key={slot.location_id}
                  type='button'
                  disabled={!slot.available}
                  className={cn(
                    'rounded-md border border-border bg-background px-3 py-2 text-left leading-tight hover:border-input disabled:pointer-events-none disabled:opacity-40'
                  )}
                  onClick={() => {
                    onPick(slot)
                    onOpenChange(false)
                  }}
                >
                  <span className='block font-mono text-sm font-semibold'>{slot.name ?? '—'}</span>
                  <span className='block text-xs text-muted-foreground'>
                    {slot.warehouse ?? '—'}
                  </span>
                  <span className='mt-1 block font-mono text-xs text-muted-foreground'>
                    {slot.used_weight}
                    {slot.max_weight === null ? '' : ` / ${slot.max_weight}`} lb ·{' '}
                    {slot.orders_on_it}
                    {slot.max_orders === null ? '' : ` / ${slot.max_orders}`} ord
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty className='h-full'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Warehouse />
                </EmptyMedia>
                <EmptyTitle>No locations</EmptyTitle>
                <EmptyDescription>
                  Locations are set up in Settings, under the warehouse they belong to.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
