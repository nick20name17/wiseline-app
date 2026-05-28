import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { WarehousesFitlerBar } from './-components/filters-bar'
import { WarehousesTable } from './-components/table/table'
import { getWarehousesQueryOptions } from '@/api/warehouses/query'
import {
  DEFAULT_LIMIT,
  LimitParamSchema,
  OffsetParamSchema,
  PaginationControls
} from '@/components/common/filters/pagination'
import { SearchParamSchema } from '@/components/common/filters/search'

const WarehousesPage = () => {
  const { offset = 0, limit = DEFAULT_LIMIT, search = '' } = Route.useSearch()
  const { data: warehouses, isLoading } = useQuery(
    getWarehousesQueryOptions({ offset, limit, search })
  )

  return (
    <section className='flex h-full flex-col space-y-4'>
      <WarehousesFitlerBar />
      <WarehousesTable
        className='flex-1'
        data={warehouses?.results ?? []}
        isLoading={isLoading}
      />
      <PaginationControls count={warehouses?.count ?? 0} />
    </section>
  )
}

export const Route = createFileRoute('/_settings/warehouses/')({
  component: WarehousesPage,
  validateSearch: z.object({
    offset: OffsetParamSchema,
    limit: LimitParamSchema,
    search: SearchParamSchema
  })
})
