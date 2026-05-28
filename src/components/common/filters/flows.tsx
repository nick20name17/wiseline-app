import { useQuery } from '@tanstack/react-query'
import * as z from 'zod/mini'

import { getDefaultCategory } from './category'
import { DEFAULT_SCHEDULE_VALUE } from './schedule'
import { getAllCategoriesQueryOptions } from '@/api/categories/query'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSearchParams } from '@/hooks/use-search-params'
import { useAuth } from '@/providers/auth'

export const DEFAULT_FLOW = 'all'

export const NON_FLOW_IDS = new Set(['all', 'wrapping', 'slinet'])
const NON_FLOW_VALUES = [...NON_FLOW_IDS] as const

export const FlowParamSchema = z._default(
  z.catch(z.optional(z.union([z.string(), z.enum(NON_FLOW_VALUES)])), DEFAULT_FLOW),
  DEFAULT_FLOW
)

export const FlowsFilter = () => {
  const { user } = useAuth()
  const { data: categories, isLoading } = useQuery(getAllCategoriesQueryOptions())

  const defaultCategory = getDefaultCategory(user)

  const [
    { category = defaultCategory, flow = DEFAULT_FLOW, schedule = DEFAULT_SCHEDULE_VALUE },
    setSearchParams
  ] = useSearchParams()

  const currentCategory = categories?.find((c) => c.name === category)

  const handleFlowChange = (value: string) => {
    setSearchParams({ flow: value, view: undefined })
  }

  if (isLoading && schedule === 'scheduled') {
    return <Skeleton className='h-9 w-full max-w-103.5 rounded-lg' />
  }

  if (category === 'wrapping' || category === 'all') {
    return null
  }

  return (
    <Tabs
      key={flow}
      defaultValue={flow.toString()}
      onValueChange={handleFlowChange}
    >
      <TabsList>
        <TabsTrigger value='all'>All</TabsTrigger>

        {category === 'Trim' && NON_FLOW_IDS.has('slinet') && (
          <TabsTrigger value='slinet'>Slinet</TabsTrigger>
        )}

        {currentCategory?.flows
          ?.filter((f) => f.name?.toLowerCase() !== 'flat stock')
          .filter((f) => !NON_FLOW_IDS.has(f.name.toLowerCase()))
          .map((flow) => (
            <TabsTrigger
              key={flow.id}
              value={flow.id.toString()}
            >
              {flow.name}
            </TabsTrigger>
          ))}
      </TabsList>
    </Tabs>
  )
}
