import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { UsersFitlerBar } from './-components/filters-bar'
import { UsersTable } from './-components/table/table'
import { getAllUsersQueryOptions } from '@/api/users/query'
import { LimitParamSchema, OffsetParamSchema } from '@/components/common/filters/pagination'
import { SearchParamSchema } from '@/components/common/filters/search'

const UsersPage = () => {
  const { data: allUsers, isLoading } = useQuery(getAllUsersQueryOptions())

  return (
    <section className='flex h-full flex-col gap-4'>
      <UsersFitlerBar />
      <UsersTable
        className='flex-1'
        data={allUsers ?? []}
        isLoading={isLoading}
      />
    </section>
  )
}

export const Route = createFileRoute('/_settings/users/')({
  component: UsersPage,
  validateSearch: z.object({
    offset: OffsetParamSchema,
    limit: LimitParamSchema,
    search: SearchParamSchema
  })
})
