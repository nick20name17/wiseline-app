import { queryOptions } from '@tanstack/react-query'

import type { OrdersSearchParams } from './schema'
import { ordersService } from './service'

export const ORDERS_QUERY_KEYS = {
  all: () => ['orders'] as const,

  lists: () => [...ORDERS_QUERY_KEYS.all(), 'list'] as const,
  list: (params: OrdersSearchParams = {}) => [...ORDERS_QUERY_KEYS.lists(), params] as const,

  details: () => [...ORDERS_QUERY_KEYS.all(), 'detail'] as const,
  detail: (id: string) => [...ORDERS_QUERY_KEYS.details(), id] as const
}

export const getOrdersQueryOptions = (params: OrdersSearchParams = {}) =>
  queryOptions({
    queryKey: ORDERS_QUERY_KEYS.list(params),
    queryFn: () => ordersService.get(params)
  })

export const getOrderQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ORDERS_QUERY_KEYS.detail(id),
    queryFn: () => ordersService.getById(id)
  })
