import { queryOptions } from '@tanstack/react-query'

import type { OriginItemsSearchParams } from './schema'
import { originItemsService } from './service'

export const ORIGIN_ITEMS_QUERY_KEYS = {
  all: () => ['origin-items'] as const,

  lists: () => [...ORIGIN_ITEMS_QUERY_KEYS.all(), 'list'] as const,

  list: (params: OriginItemsSearchParams = {}) =>
    [...ORIGIN_ITEMS_QUERY_KEYS.lists(), params] as const
}

export const getOriginItemsQueryOptions = (params: OriginItemsSearchParams = {}) =>
  queryOptions({
    queryKey: ORIGIN_ITEMS_QUERY_KEYS.list(params),
    queryFn: () => originItemsService.get(params)
  })
