import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { TrucksFitlerBar } from './-components/filters-bar'
import { TrucksTable } from './-components/table/table'
import { getTrucksQueryOptions } from '@/api/trucks/query'
import {
  DEFAULT_LIMIT,
  LimitParamSchema,
  OffsetParamSchema,
  PaginationControls
} from '@/components/common/filters/pagination'
import { SearchParamSchema } from '@/components/common/filters/search'

const TrucksPage = () => {
  const { limit = DEFAULT_LIMIT, offset = 0, search = '' } = Route.useSearch()

  const { data: trucks, isLoading } = useQuery(getTrucksQueryOptions({ offset, limit, search }))

  return (
    <section className='flex h-full flex-col gap-4'>
      <TrucksFitlerBar />
      <TrucksTable
        className='min-h-0 flex-1'
        data={trucks ?? []}
        isLoading={isLoading}
      />
      <PaginationControls count={trucks?.length ?? 0} />
    </section>
  )
}

export const Route = createFileRoute('/_settings/trucks/')({
  component: TrucksPage,
  validateSearch: z.object({
    offset: OffsetParamSchema,
    limit: LimitParamSchema,
    search: SearchParamSchema
  })
})
