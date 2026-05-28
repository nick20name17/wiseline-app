import { RiMap2Line } from '@remixicon/react'
import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { Suspense, lazy, useState } from 'react'

import { getGeocodeQueryOptions } from '@/api/geocode/query'
import type { Order } from '@/api/orders/schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const RoutesMap = lazy(() => import('@/components/common/map/routes-map'))

interface MapDialogProps {
  className?: string
  order: Order
}

export const MapDialog = ({ order }: MapDialogProps) => {
  const [open, setOpen] = useState(false)

  const address = [order.c_country, order.c_state, order.c_city, order.c_address1]
    .filter(Boolean)
    .join(', ')

  const { data: geocode, isLoading } = useQuery({
    ...getGeocodeQueryOptions({
      address
    }),
    enabled: open && !!order.c_city && !!order.c_state
  })

  const location = geocode?.results?.[0]?.geometry.location

  const routes = location
    ? [
        {
          id: order.id,
          name: address,
          waypoint: L.latLng(location.lat, location.lng)
        }
      ]
    : []

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button
          disabled={!order.c_city}
          className={cn('h-6')}
          variant='outline'
          size='sm'
        >
          <RiMap2Line />
          <span>Map</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='flex h-[calc(100vh-8rem)] flex-col sm:max-w-300'>
        <DialogHeader>
          <DialogTitle>Map</DialogTitle>
        </DialogHeader>

        <Suspense fallback={<Skeleton className='size-full' />}>
          {isLoading ? (
            <Skeleton className='size-full' />
          ) : address ? (
            <RoutesMap
              key={location?.lat + '-' + location?.lng}
              className='rounded-2xl'
              stops={routes.map((r) => ({ point: r.waypoint, name: r.name }))}
            />
          ) : (
            <AddressNotFound />
          )}
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}

export const AddressNotFound = ({ className }: { className?: string }) => {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <RiMap2Line />
        </EmptyMedia>
        <EmptyTitle>No address found</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
