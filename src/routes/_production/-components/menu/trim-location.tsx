import { RiCheckLine, RiMapPinLine } from '@remixicon/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import type { Location } from '@/api/locations/schema'
import { getWarehousesQueryOptions } from '@/api/warehouses/query'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface TrimLocationMenuProps {
  className?: string
  locationId: number | null
  disabled?: boolean
  setLocation: (locationId: number | null) => void
}

export const TrimLocationMenu = ({
  className,
  locationId,
  setLocation,
  disabled = false
}: TrimLocationMenuProps) => {
  const [open, setOpen] = useState(false)

  const { data: warehouses, isLoading } = useQuery({
    ...getWarehousesQueryOptions()
  })

  const currentLocationName = warehouses?.results
    ?.flatMap((warehouse) => warehouse.locations)
    .find((location) => location.id === locationId)?.code

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant='outline'
          className={cn('justify-start', className)}
        >
          <RiMapPinLine className='text-muted-foreground' />
          <span>{currentLocationName ?? 'Choose Location'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-160'
        side='top'
        align='start'
      >
        <h3 className='leading-none font-bold'>Choose Location</h3>
        <ScrollArea
          className='mt-4'
          type='always'
        >
          <div className='h-full max-h-90 min-h-0 space-y-3'>
            {isLoading ? (
              <LocationsSkeleton />
            ) : (
              warehouses?.results?.map((warehouse) => {
                return (
                  <div className='space-y-1.5'>
                    <div className='text-sm leading-none'>{warehouse.name}</div>
                    <Separator />
                    <div className='flex flex-wrap items-center gap-1.5'>
                      {warehouse.locations.map((location) => (
                        <LocationItem
                          key={location.id}
                          location={location}
                          locationId={locationId}
                          setLocation={(locationId) => {
                            setLocation(locationId)
                            setOpen(false)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

const LocationsSkeleton = () => {
  return Array.from({ length: 3 }).map((_, index) => (
    <div
      className='space-y-1.5'
      key={index}
    >
      <Skeleton className='h-3.5 w-20' />

      <Separator />
      <div className='flex flex-wrap items-center gap-1.5'>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton
            className='h-7 w-14 rounded-full'
            key={index}
          />
        ))}
      </div>
    </div>
  ))
}

interface LocationItemProps {
  location: Location
  setLocation: (locationId: number | null) => void
  locationId: number | null
}

const LocationItem = ({ location, setLocation, locationId }: LocationItemProps) => {
  const active = location.id === locationId

  return (
    <div
      onClick={() => setLocation(location.id === locationId ? null : location.id)}
      className={cn(
        'flex h-7 cursor-pointer items-center justify-center gap-2.5 rounded-full border px-2.5 text-sm leading-none transition-colors',
        {
          'bg-muted text-muted-foreground pointer-events-none': active,
          'border-muted-foreground bg-muted': active
        }
      )}
    >
      {active ? <RiCheckLine className='size-4' /> : null}
      <span> {location.code}</span>
    </div>
  )
}
