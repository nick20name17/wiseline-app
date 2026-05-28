import { useQuery } from '@tanstack/react-query'
import * as z from 'zod/mini'

import { DEFAULT_SCHEDULE_VALUE } from './schedule'
import { getAllCategoriesQueryOptions } from '@/api/categories/query'
import type { User } from '@/api/users/schema'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSearchParams } from '@/hooks/use-search-params'
import { useAuth } from '@/providers/auth'

export const CategoryParamSchema = z.catch(z.optional(z.string()), undefined)

export const getDefaultCategory = (user: User | null) => {
  if (user?.role === 'admin' || user?.role === 'super_manager') return 'all'

  return user?.prod_types[0]
}

export const CategoryFilter = () => {
  const { user } = useAuth()

  const defaultCategory = getDefaultCategory(user)

  const { data, isLoading } = useQuery(getAllCategoriesQueryOptions())

  const categories =
    user && user.role !== 'admin' && user.role !== 'super_manager'
      ? data?.filter((c) => user.prod_types?.includes(c.name))
      : data

  const [{ category = defaultCategory, schedule = DEFAULT_SCHEDULE_VALUE }, setSearchParams] =
    useSearchParams()

  const handleCategoryChange = (value: string) => {
    setSearchParams({
      category: value,
      flow: undefined,
      view: value === 'wrapping' ? 'all' : 'groupped'
    })
  }

  if (isLoading) {
    return <Skeleton className='h-9 w-full max-w-117 rounded-lg' />
  }

  const showAllOption = user?.role === 'admin' || user?.role === 'super_manager'

  return (
    <Tabs
      key={schedule + category}
      defaultValue={category?.toString()}
      onValueChange={handleCategoryChange}
    >
      <TabsList>
        {showAllOption ? <TabsTrigger value='all'>All</TabsTrigger> : null}
        {categories
          ?.filter((category) => category.name?.toLowerCase() !== 'accessories')
          .map((category) => (
            <TabsTrigger
              key={category.name}
              value={category.name.toString()}
            >
              {category.name}
            </TabsTrigger>
          ))}
        {schedule === 'all' ? null : <TabsTrigger value='wrapping'>Wrapping</TabsTrigger>}
      </TabsList>
    </Tabs>
  )
}
