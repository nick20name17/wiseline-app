import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RiDraggable, RiMapPinLine } from '@remixicon/react'
import { useQueryClient } from '@tanstack/react-query'
import L from 'leaflet'
import { useState } from 'react'

import { MapLink } from './map-link'
import type { Route } from './types'
import { getGeocodeQueryOptions } from '@/api/geocode/query'
import { BasicInputWithSubmit } from '@/components/common/inputs/basic-input-with-submit'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RouteItemProps {
  route: Route
  index: number
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>
  readonly?: boolean
}

export const RouteItem = ({ route, index, readonly, setRoutes }: RouteItemProps) => {
  const isLocked = route.route.dispatch_point || readonly
  const isInvalid = route.point === null

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: route.id,
    disabled: isLocked
  })

  const [city, setCity] = useState(() => route.route.c_city ?? '')
  const [address, setAddress] = useState(() => route.route.c_address ?? '')

  const queryClient = useQueryClient()

  const onAddressSubmit = async (value: string) => {
    const address = [route.route.c_country, route.route.c_state, city, value]
      .filter(Boolean)
      .join(', ')

    if (address) {
      const geocode = await queryClient.fetchQuery(getGeocodeQueryOptions({ address }))

      if (geocode) {
        setRoutes((routes) => {
          const newRoutes = [...routes]
          newRoutes[index] = {
            ...route,
            name: address,
            route: {
              ...route.route,
              c_address: value
            },
            point: L.latLng(
              geocode.results[0].geometry.location.lat,
              geocode.results[0].geometry.location.lng
            )
          }
          return newRoutes
        })
      }
    }
  }

  const onCitySubmit = async (value: string) => {
    const addressParam = [route.route.c_country, route.route.c_state, value, address]
      .filter(Boolean)
      .join(', ')

    const geocode = await queryClient.fetchQuery(getGeocodeQueryOptions({ address: addressParam }))

    if (geocode) {
      setRoutes((routes) => {
        const newRoutes = [...routes]
        newRoutes[index] = {
          ...route,
          name: addressParam,
          route: {
            ...route.route,
            c_city: value
          },
          point: L.latLng(
            geocode.results[0].geometry.location.lat,
            geocode.results[0].geometry.location.lng
          )
        }
        return newRoutes
      })
    }
  }

  return (
    <li
      {...(!isLocked && {
        ref: setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition },
        ...attributes
      })}
      className='flex h-10 items-center gap-2'
    >
      <div className='bg-muted relative z-1 flex size-5 shrink-0 items-center justify-center rounded-md text-xs'>
        {index + 1}
      </div>

      <div
        className={cn(
          'bg-background flex h-full flex-1 items-center gap-1 rounded-md border px-2',
          {
            'border-destructive bg-destructive/5': isInvalid
          }
        )}
      >
        <RiMapPinLine className='text-muted-foreground size-4 shrink-0 max-md:hidden' />

        <span className='text-xs whitespace-nowrap max-md:hidden xl:text-sm'>
          {route.route.c_country} - {route.route.c_state} -
        </span>

        {isLocked ? (
          <span className='text-xs xl:text-sm'>{city}</span>
        ) : (
          <BasicInputWithSubmit
            className='h-6 w-1/2'
            placeholder='Enter city'
            type='text'
            value={city}
            setValue={(value) => setCity(value ?? '')}
            onSubmit={({ value }) => onCitySubmit(value)}
          />
        )}

        <span>-</span>

        {isLocked ? (
          <span className='text-xs xl:text-sm'>{address}</span>
        ) : (
          <BasicInputWithSubmit
            className='h-6 w-full'
            placeholder='Enter address'
            type='text'
            value={address}
            setValue={(value) => setAddress(value ?? '')}
            onSubmit={({ value }) => onAddressSubmit(value)}
          />
        )}
      </div>

      {readonly && route.point?.lat && route.point?.lng ? (
        <MapLink
          lat={route.point.lat}
          lng={route.point.lng}
        />
      ) : null}

      {!isLocked && (
        <Button
          size='icon'
          variant='ghost'
          {...listeners}
        >
          <RiDraggable className='size-4' />
        </Button>
      )}
    </li>
  )
}
