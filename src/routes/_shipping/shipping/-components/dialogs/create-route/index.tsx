import {
  RiCheckboxCircleFill,
  RiCloseCircleLine,
  RiDirectionLine,
  RiLoader2Fill
} from '@remixicon/react'
import { useMutation, useQuery, useSuspenseQueries } from '@tanstack/react-query'
import L from 'leaflet'
import { type PropsWithChildren, Suspense, lazy, useState } from 'react'
import { toast } from 'sonner'

import { shouldUpdateRoute } from './helpers'
import { RoutesList } from './route-list'
import type { Route } from './types'
import { getGeocodeQueryOptions } from '@/api/geocode/query'
import type { GeocodeResponse } from '@/api/geocode/schema'
import { LOADS_QUERY_KEYS, getLoadQueryOptions, useUpdateLoad } from '@/api/loads/query'
import type { SingleLoad } from '@/api/loads/schema'
import { routesService } from '@/api/routes/service'
import { AddressNotFound } from '@/components/common/dialogs/map'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { ModalState } from '@/types/modal'

const RoutesMap = lazy(() => import('@/components/common/map/routes-map'))

interface CreateRouteDialogProps extends PropsWithChildren {
  loadId: number | undefined
  readonly?: boolean
}

export const CreateRouteDialog = ({
  children,
  loadId,
  readonly: externalReadonly = false
}: CreateRouteDialogProps) => {
  const [open, setOpen] = useState(false)

  const { data: load, isLoading } = useQuery({
    ...getLoadQueryOptions(loadId ?? -1),
    enabled: !!loadId && open
  })

  const readonly = externalReadonly || load?.ready_to_load

  if (isLoading) return <Skeleton className='h-9 w-20' />

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        {children ?? (
          <Button
            className='w-32'
            disabled={!load?.routes?.length}
            variant={readonly ? 'default' : 'info'}
          >
            <RiDirectionLine />
            <span>{readonly ? 'Route' : 'Build Route'}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className='flex h-[calc(50vh)] flex-col gap-3.5 sm:max-w-300 xl:h-[calc(100vh-8rem)]'>
        <DialogHeader>
          <DialogTitle>{readonly ? 'Route' : 'Build Route'}</DialogTitle>
        </DialogHeader>

        {load ? (
          <Suspense
            fallback={
              <RiLoader2Fill className='absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 animate-spin' />
            }
          >
            <DialogMapContent
              load={load}
              readonly={!!readonly}
              open={open}
              setOpen={setOpen}
            />
          </Suspense>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

interface DialogMapContentProps extends ModalState {
  load: SingleLoad
  readonly: boolean
}

const DialogMapContent = ({ load, readonly, open, setOpen }: DialogMapContentProps) => {
  const sortedRoutes =
    load?.routes?.toSorted((a, b) => {
      const posA = a.position ?? Number.MAX_SAFE_INTEGER
      const posB = b.position ?? Number.MAX_SAFE_INTEGER
      return posA - posB
    }) ?? []

  const geocodes = useSuspenseQueries({
    queries: sortedRoutes.map((route) => {
      const address = [route.c_city, route.c_state, route.c_country, route.c_address]
        .filter(Boolean)
        .join(', ')

      const lat = route.extra_info?.lat
      const lng = route.extra_info?.lng
      const hasCached = typeof lat === 'number' && typeof lng === 'number'

      const base = getGeocodeQueryOptions({ address })

      return {
        ...base,
        enabled: !!address && open,
        staleTime: hasCached ? Infinity : base.staleTime,
        gcTime: hasCached ? Infinity : base.gcTime,

        queryFn: hasCached
          ? async () =>
              ({
                status: 'OK',
                results: [{ geometry: { location: { lat, lng } } }]
              }) as GeocodeResponse
          : base.queryFn,

        select: (data: GeocodeResponse) => {
          const name = [route.c_city, route.c_state, route.c_country, route.c_address]
            .filter(Boolean)
            .join(', ')
          const loc = data.results[0].geometry.location

          return {
            id: route.id,
            name,
            route: {
              ...route,
              extra_info: route.extra_info ?? {
                routeId: route.id,
                lat: loc.lat,
                lng: loc.lng
              }
            },
            geocode: data
          }
        }
      }
    }),

    combine: (res) =>
      res.map((r) => {
        const loc = r.data.geocode.results[0].geometry.location
        return {
          id: r.data.id,
          name: r.data.name,
          route: r.data.route,
          point: L.latLng(loc.lat, loc.lng)
        }
      })
  })

  const [routesGeocode, setRoutesGeocode] = useState<Route[]>(geocodes)

  const routeUpdateMutation = useMutation({
    mutationFn: routesService.update,
    meta: { invalidatesQuery: LOADS_QUERY_KEYS.all() },
    onSuccess: () => {
      toast.success('Routes updated')
    }
  })

  const { handleUpdateLoad, isPending } = useUpdateLoad({
    onSuccess: () => setOpen(false)
  })

  // const hasRouteChanges = useMemo(() => {
  //   if (routesGeocode.some((r) => r.point === null)) return false

  //   return routesGeocode.some((r, index) => {
  //     const next = { lat: r.point!.lat, lng: r.point!.lng }
  //     return shouldUpdateRoute(r.route, next, index)
  //   })
  // }, [routesGeocode])

  const handleConfirmRoute = () => {
    if (routesGeocode.some((r) => r.point === null)) {
      toast.warning('All cities and addresses must be valid')
      return
    }

    routesGeocode.forEach((route, index) => {
      const next = { lat: route.point!.lat, lng: route.point!.lng }

      if (!shouldUpdateRoute(route.route, next, index)) return

      routeUpdateMutation.mutate({
        id: route.id,
        payload: {
          ...route.route,
          position: index,
          extra_info: {
            ...route.route.extra_info,
            routeId: route.id,
            ...next
          }
        }
      })
    })

    if (load && !load.road_confirmed) {
      handleUpdateLoad({ id: load.id, payload: { road_confirmed: true } })
    }
  }

  return (
    <div className='xl:bg-muted relative flex-1 xl:overflow-hidden xl:rounded-2xl xl:p-4.5'>
      <div className='absolute inset-0 max-xl:hidden'>
        {routesGeocode.every((r) => r.point === null) ? (
          <AddressNotFound className='ml-auto h-full w-1/2' />
        ) : (
          <RoutesMap
            className='ml-auto w-1/2'
            stops={routesGeocode
              .filter((g) => g.point !== null)
              .map((g) => ({ point: g.point!, name: g.name }))}
          />
        )}
      </div>
      <div className='bg-background relative z-10 flex size-full max-w-150 flex-col justify-between rounded-xl xl:border xl:p-4'>
        <RoutesList
          routes={routesGeocode}
          setRoutes={setRoutesGeocode}
          readonly={readonly}
        />

        {!readonly && (
          <div className='mt-auto flex w-full gap-2.5'>
            <Button
              className='flex-1'
              disabled={isPending || routeUpdateMutation.isPending}
              isLoading={isPending || routeUpdateMutation.isPending}
              onClick={handleConfirmRoute}
            >
              <RiCheckboxCircleFill />
              Confirm route
            </Button>

            <DialogClose asChild>
              <Button
                variant='secondary'
                className='flex-1'
              >
                <RiCloseCircleLine />
                Cancel
              </Button>
            </DialogClose>
          </div>
        )}
      </div>
    </div>
  )
}
