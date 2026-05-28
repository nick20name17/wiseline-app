import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { PrioritiesFitlerBar } from './-components/filters-bar'
import { PrirotiesTable } from './-components/table/table'
import { getPrioritiesQueryOptions } from '@/api/priorities/query'
import { SearchParamSchema } from '@/components/common/filters/search'

const PrioritiesPage = () => {
  const { data: priorities, isLoading } = useQuery(getPrioritiesQueryOptions())

  return (
    <section className='flex h-full flex-col gap-4'>
      <PrioritiesFitlerBar />
      <PrirotiesTable
        className='min-h-0 flex-1'
        data={priorities ?? []}
        isLoading={isLoading}
      />
    </section>
  )
}

export const Route = createFileRoute('/_settings/priorities/')({
  component: PrioritiesPage,
  validateSearch: z.object({
    search: SearchParamSchema
  })
})
