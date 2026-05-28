import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { CategoriesList } from './-components/category/list'
import { getAllCategoriesQueryOptions } from '@/api/categories/query'
import { LimitParamSchema, OffsetParamSchema } from '@/components/common/filters/pagination'
import { SearchParamSchema } from '@/components/common/filters/search'

const FlowsPage = () => {
  const { data: categories, isLoading } = useQuery(getAllCategoriesQueryOptions())

  return (
    <section className='mx-auto flex h-full max-w-4xl flex-col gap-4'>
      <CategoriesList
        categories={categories ?? []}
        isLoading={isLoading}
      />
    </section>
  )
}

export const Route = createFileRoute('/_settings/flows/')({
  component: FlowsPage,
  validateSearch: z.object({
    offset: OffsetParamSchema,
    limit: LimitParamSchema,
    search: SearchParamSchema
  })
})
