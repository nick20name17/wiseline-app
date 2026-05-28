import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { DEFAULT_DISPATCH, DispatchParamSchema } from '../-components/filters/dispatch'
import { TruckParamSchema } from '../-components/filters/truck'

import { DispatchFiltersBar } from './-components/filters-bar'
import { DispatchOrdersTable } from './-components/tables/dispatch-orders'
import { PackageItemsTable } from './-components/tables/package-items'
import { PackagesTable } from './-components/tables/packages'
import { getOrdersQueryOptions } from '@/api/orders/query'
import { getPackagesItemsQueryOptions } from '@/api/packages-items/query'
import { getPackagesQueryOptions } from '@/api/packages/query'
import { DEFAULT_DATE_VALUE, DateParamSchema } from '@/components/common/filters/date'
import {
  DEFAULT_LIMIT,
  LimitParamSchema,
  OffsetParamSchema,
  PaginationControls
} from '@/components/common/filters/pagination'
import { ScheduleParamSchema } from '@/components/common/filters/schedule'
import { SearchParamSchema } from '@/components/common/filters/search'

const DispatchPage = () => {
  const {
    limit = DEFAULT_LIMIT,
    offset = 0,
    truck,
    date = DEFAULT_DATE_VALUE,
    // search,
    dispatch = DEFAULT_DISPATCH,
    sort
  } = Route.useSearch()

  const isOrders = dispatch === 'order'
  const isPackages = dispatch === 'packages'
  const isItems = dispatch === 'items'

  const packagesQuery = useQuery({
    ...getPackagesQueryOptions({
      limit,
      offset,
      truck_id: truck ? +truck : undefined,
      production_date: date ? date : undefined
    }),
    enabled: isPackages
  })

  const packageItemsQuery = useQuery({
    ...getPackagesItemsQueryOptions({
      limit,
      offset,
      production_date: date ? date : undefined,
      truck_id: truck ? +truck : undefined
    }),
    enabled: isItems
  })

  const ordersQuery = useQuery({
    ...getOrdersQueryOptions({
      production_date: date ? date : undefined,
      release_to_production: true,
      ordering: sort
    }),
    enabled: isOrders
  })

  const viewModel = isOrders
    ? ({
        mode: 'order',
        data: ordersQuery.data?.results ?? [],
        count: ordersQuery.data?.count ?? 0,
        loading: ordersQuery.isLoading
      } as const)
    : isPackages
      ? ({
          mode: 'packages',
          data: packagesQuery.data?.results ?? [],
          count: packagesQuery.data?.count ?? 0,
          loading: packagesQuery.isLoading
        } as const)
      : ({
          mode: 'items',
          data: packageItemsQuery.data?.results ?? [],
          count: packageItemsQuery.data?.count ?? 0,
          loading: packageItemsQuery.isLoading
        } as const)

  return (
    <div className='flex h-full flex-col gap-4'>
      <DispatchFiltersBar />
      {viewModel.mode === 'order' && (
        <DispatchOrdersTable
          data={viewModel.data}
          isLoading={viewModel.loading}
        />
      )}

      {viewModel.mode === 'items' && (
        <PackageItemsTable
          data={viewModel.data}
          isLoading={viewModel.loading}
        />
      )}

      {viewModel.mode === 'packages' && (
        <PackagesTable
          data={viewModel.data}
          isLoading={viewModel.loading}
        />
      )}

      <PaginationControls count={viewModel.count} />
    </div>
  )
}

export const Route = createFileRoute('/_shipping/dispatch/')({
  component: DispatchPage,
  validateSearch: z.object({
    search: SearchParamSchema,
    schedule: ScheduleParamSchema,
    offset: OffsetParamSchema,
    limit: LimitParamSchema,
    date: DateParamSchema,
    dispatch: DispatchParamSchema,
    truck: TruckParamSchema,
    sort: z.optional(z.string())
  })
})
