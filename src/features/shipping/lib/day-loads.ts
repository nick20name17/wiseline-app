import { useQueries, useQuery } from '@tanstack/react-query'
import { loadsQuery, scheduledQuery, type LoadTab, type TruckCard } from '../api'

/** A day's Loads whose status is one of `statuses`, truck by truck. */
export const useDayLoads = (day: string, statuses: ReadonlySet<string>) => {
  const scheduled = useQuery(scheduledQuery(day))
  const cards = scheduled.data
  const trucks = (cards ?? []).filter(card => card.orders.some(order => order.load_id !== null))
  const loads = useQueries({ queries: trucks.map(card => loadsQuery(card.truck_id, day)) })
  const found: { card: TruckCard; load: LoadTab }[] = trucks.flatMap((card, index) =>
    (loads[index]?.data ?? [])
      .filter(load => statuses.has(load.status ?? '') && load.orders.length)
      .map(load => ({ card, load }))
  )
  const failed = [scheduled, ...loads].find(query => query.isError)
  return {
    loads: found,
    isPending: scheduled.isPending || loads.some(query => query.isPending),
    error: failed?.error ?? null,
    refetch: () => {
      void scheduled.refetch()
      for (const query of loads) void query.refetch()
    }
  }
}
