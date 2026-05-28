import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { LocationsFitlerBar } from './-components/filters-bar'
import { LocationsTable } from './-components/table/table'
import { getLocationsQueryOptions } from '@/api/locations/query'
import {
  DEFAULT_LIMIT,
  LimitParamSchema,
  OffsetParamSchema,
  PaginationControls
} from '@/components/common/filters/pagination'
import { SearchParamSchema } from '@/components/common/filters/search'

const LocationsPage = () => {
  const { offset = 0, limit = DEFAULT_LIMIT, search = '' } = Route.useSearch()
  const { data: locations, isLoading } = useQuery(
    getLocationsQueryOptions({ offset, limit, search })
  )

  return (
    <section className='flex h-full flex-col gap-4'>
      <LocationsFitlerBar />
      <LocationsTable
        className='min-h-0 flex-1'
        data={locations?.results ?? []}
        isLoading={isLoading}
      />
      <PaginationControls count={locations?.count ?? 0} />
    </section>
  )
}

export const Route = createFileRoute('/_settings/locations/')({
  component: LocationsPage,
  validateSearch: z.object({
    offset: OffsetParamSchema,
    limit: LimitParamSchema,
    search: SearchParamSchema
  })
})
