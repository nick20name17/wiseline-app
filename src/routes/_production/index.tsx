import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { ProductionFiltersBar } from './-components/filters-bar'
import { CUT_VIEW_DEFAULT_VALUE, CutViewSchema } from './-components/filters/cut-view'
import { ProductionHeader } from './-components/header'
import { getCategoryFilter } from './-components/helpers'
import { GroupedDateColorGaugeTable } from './-components/tables/grouped-date-color-gauge/table'
import { CuttingGroupedTable } from './-components/tables/grouped-priority/table'
import { WrappingTable } from './-components/tables/wrapping'
import { getOrdersQueryOptions } from '@/api/orders/query'
import { getOriginItemsQueryOptions } from '@/api/origin-items/query'
import { CategoryParamSchema, getDefaultCategory } from '@/components/common/filters/category'
import { DEFAULT_DATE_VALUE, DateParamSchema } from '@/components/common/filters/date'
import { DEFAULT_FLOW, FlowParamSchema, NON_FLOW_IDS } from '@/components/common/filters/flows'
import {
  DEFAULT_LIMIT,
  LimitParamSchema,
  OffsetParamSchema,
  PaginationControls
} from '@/components/common/filters/pagination'
import { DEFAULT_SCHEDULE_VALUE, ScheduleParamSchema } from '@/components/common/filters/schedule'
import { SearchParamSchema } from '@/components/common/filters/search'
import { OrdersTable } from '@/components/common/orders/table'
import { getVisibleFeatures } from '@/config/permissions/features'
import { useAuth } from '@/providers/auth'

type ViewType = 'orders' | 'cutting' | 'grouped' | 'wrapping' | null

export const getActiveView = (flow: string, category: string | undefined): ViewType => {
  if (category === 'wrapping') return 'wrapping'
  if (flow === 'slinet') return 'cutting'
  if (+flow) return 'grouped'
  if (flow === 'all' && category !== 'wrapping') return 'orders'

  return 'orders'
}

const ProductionPage = () => {
  const { user } = useAuth()

  const defaultCategory = getDefaultCategory(user)

  const {
    date = DEFAULT_DATE_VALUE,
    limit = DEFAULT_LIMIT,
    offset = 0,
    search,
    schedule = DEFAULT_SCHEDULE_VALUE,
    category = defaultCategory,
    flow = DEFAULT_FLOW,
    view = CUT_VIEW_DEFAULT_VALUE,
    sort
  } = Route.useSearch()

  const isScheduled = schedule === 'scheduled'

  const visibleFeatures = getVisibleFeatures(user?.role ?? 'worker')
  const canUseScheduleFilter = visibleFeatures.has('scheduleFilter')

  const activeView = getActiveView(flow, category)

  const categoryFilter = getCategoryFilter({ category, user })

  const {
    data: orders,
    isLoading,
    isPlaceholderData
  } = useQuery({
    placeholderData: keepPreviousData,
    ...getOrdersQueryOptions({
      production_date: isScheduled ? date : undefined,
      limit,
      offset,
      search,
      is_scheduled: schedule === 'all' ? undefined : isScheduled,
      ordering: sort,
      release_to_production: user?.role === 'worker' ? true : undefined,
      category__in: categoryFilter,
      flow_id: NON_FLOW_IDS.has(flow) || !visibleFeatures.has('flowsFilter') ? undefined : flow
    }),
    enabled: activeView === 'orders'
  })

  // const { data: geo } = useQuery({
  //   queryFn: () => geocodeService.get({ address: 'Canada, ON, Fort Erie, 2554 Garrison Road' }),
  //   queryKey: ['geocode']
  // })

  const {
    data: originItems,
    isLoading: isOriginItemsLoading,
    isPlaceholderData: isItemsPlaceholderData
  } = useQuery({
    placeholderData: keepPreviousData,
    ...getOriginItemsQueryOptions({
      limit,
      offset,
      search,
      is_wrapping: category === 'wrapping' ? true : undefined,
      production_date: isScheduled ? date : undefined,
      category__in: categoryFilter,
      release_to_production: user?.role === 'worker' ? true : undefined,
      status: view === 'stock' ? 'stock' : undefined,
      status__not_in: view === 'manufactured' || category !== 'wrapping' ? 'stock' : undefined,
      flow_id: NON_FLOW_IDS.has(flow) || !visibleFeatures.has('flowsFilter') ? undefined : flow,
      flow_id__isnull: category === 'wrapping' ? undefined : false
    }),
    enabled: activeView !== 'orders'
  })

  return (
    <>
      <ProductionHeader />
      <main className='container flex h-(--main-height) flex-col gap-4 pb-4'>
        <ProductionFiltersBar />
        {activeView === 'orders' ? (
          <OrdersTable
            data={orders?.results ?? []}
            isLoading={isLoading || isPlaceholderData}
            columnVisibility={{
              completed_date: false,
              status: isScheduled,
              priority: isScheduled,
              release_to_production: isScheduled && canUseScheduleFilter,
              review: isScheduled && canUseScheduleFilter
            }}
            subTableColumnVisibility={{
              checkbox: true,
              flow: isScheduled,
              status: isScheduled,
              pfs: isScheduled,
              wrapped_from: false,
              remanufacturing_from_stock_qty: false,
              remanufacturing_qty: false,
              pull_from_stock: false,
              left_to_wrap: false,
              order: false,
              customer: false
            }}
          />
        ) : null}
        {activeView === 'cutting' ? (
          <CuttingGroupedTable
            className='flex-1'
            data={originItems?.results || []}
            isLoading={isOriginItemsLoading || isItemsPlaceholderData}
          />
        ) : null}

        {activeView === 'grouped' ? (
          <GroupedDateColorGaugeTable
            data={originItems?.results || []}
            isLoading={isOriginItemsLoading || isItemsPlaceholderData}
          />
        ) : null}
        {activeView === 'wrapping' ? (
          <WrappingTable
            data={originItems?.results ?? []}
            isLoading={isOriginItemsLoading || isItemsPlaceholderData}
          />
        ) : null}
        <PaginationControls
          count={activeView === 'orders' ? (orders?.count ?? 0) : (originItems?.count ?? 0)}
        />
      </main>
    </>
  )
}

export const Route = createFileRoute('/_production/')({
  component: ProductionPage,
  validateSearch: z.object({
    search: SearchParamSchema,
    date: DateParamSchema,
    schedule: ScheduleParamSchema,
    limit: LimitParamSchema,
    offset: OffsetParamSchema,
    flow: FlowParamSchema,
    category: CategoryParamSchema,
    view: CutViewSchema,
    sort: z.optional(z.string())
  })
})
