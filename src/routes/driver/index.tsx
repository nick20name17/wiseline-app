import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod/mini'

import { DeliveriesList } from './-components/deliveries/list'
import { DriverFilters } from './-components/filters-bar'
import { getLoadsQueryOptions } from '@/api/loads/query'
import { DEFAULT_DATE_VALUE, DateParamSchema } from '@/components/common/filters/date'
import { useWebsocketSubscription } from '@/hooks/use-websocket'

const DriverPage = () => {
  const { date = DEFAULT_DATE_VALUE } = Route.useSearch()
  const {
    data: loads,
    isLoading,
    isRefetching,
    refetch
  } = useQuery(getLoadsQueryOptions({ load_date: date, ready_to_load: true }))

  useWebsocketSubscription({
    route: '/loads/',
    onMessage: () => {
      if (!isRefetching) {
        refetch()
      }
    }
  })

  return (
    <div className='mt-4 flex min-h-0 flex-1 flex-col'>
      <DriverFilters />

      <div className='mt-3 flex-1 overflow-y-auto'>
        <DeliveriesList
          className='h-full'
          loads={loads?.results ?? []}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/driver/')({
  component: DriverPage,
  validateSearch: z.object({
    date: DateParamSchema
  })
})
