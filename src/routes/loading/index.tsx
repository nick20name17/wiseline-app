import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import * as z from 'zod/mini'

import { DEFAULT_DISPATCH, DispatchParamSchema } from '../_shipping/-components/filters/dispatch'
import { LoadParamSchema } from '../_shipping/-components/filters/load'
import { TruckParamSchema } from '../_shipping/-components/filters/truck'
import { PackageItemsTable } from '../_shipping/dispatch/-components/tables/package-items'

import { LoadingFiltersBar } from './-components/filters-bar'
import { LoadingHeader } from './-components/header'
import { ConfirmLoadPopup } from './-components/popups/confrim-load'
import { PackagesSkidsTable } from './-components/tables/packages-skids'
import { getLoadQueryOptions } from '@/api/loads/query'
import type { SingleLoad } from '@/api/loads/schema'
import { DateParamSchema } from '@/components/common/filters/date'
import { LimitParamSchema, OffsetParamSchema } from '@/components/common/filters/pagination'
import { ScheduleParamSchema } from '@/components/common/filters/schedule'
import { SearchParamSchema } from '@/components/common/filters/search'
import { useWebsocketSubscription } from '@/hooks/use-websocket'

const ShippingPage = () => {
  const {
    // date = DEFAULT_DATE_VALUE,
    // search,
    // schedule = DEFAULT_SCHEDULE_VALUE,
    dispatch = DEFAULT_DISPATCH,
    load: loadId
  } = Route.useSearch()

  const isPackSkid = dispatch === 'pack-skid'
  const isItems = dispatch === 'items'

  const { data: load, isLoading } = useQuery({
    ...getLoadQueryOptions(loadId ? Number(loadId) : -1),
    enabled: !!loadId
  })

  const packagePackageItems = load?.packages?.flatMap((p) => p.package_items) ?? []
  const skidPackageItems =
    load?.skids?.flatMap((s) => s.packages.flatMap((p) => p.package_items)) ?? []

  const allPackageItems = [...packagePackageItems, ...skidPackageItems]

  const queryClient = useQueryClient()

  useWebsocketSubscription({
    route: '/loads/',
    onMessage: (data) => {
      queryClient.setQueryData(
        getLoadQueryOptions(loadId ? Number(loadId) : -1).queryKey,
        data as SingleLoad
      )
    }
  })

  const resetKey = useMemo(() => {
    if (!load) return '—'
    const pkg = load.packages.map((p) => `${p.id}:${p.is_loaded ? 1 : 0}`).join('|')
    const skd = load.skids.map((s) => `${s.id}:${s.is_loaded ? 1 : 0}`).join('|')
    return `${pkg}__${skd}`
  }, [load])

  return (
    <>
      <LoadingHeader />
      <main className='container flex h-(--main-height) flex-col gap-4 pb-4'>
        <LoadingFiltersBar />
        {isItems && (
          <PackageItemsTable
            data={allPackageItems}
            isLoading={isLoading}
          />
        )}

        {isPackSkid && (
          <PackagesSkidsTable
            data={[...(load?.packages ?? []), ...(load?.skids ?? [])]}
            isLoading={isLoading}
          />
        )}

        {load ? (
          <ConfirmLoadPopup
            load={load}
            key={resetKey}
          />
        ) : null}
      </main>
    </>
  )
}

export const Route = createFileRoute('/loading/')({
  component: ShippingPage,
  validateSearch: z.object({
    search: SearchParamSchema,
    schedule: ScheduleParamSchema,
    offset: OffsetParamSchema,
    limit: LimitParamSchema,
    date: DateParamSchema,
    dispatch: DispatchParamSchema,
    truck: TruckParamSchema,
    load: LoadParamSchema
  })
})
