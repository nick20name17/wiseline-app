import { queryOptions } from '@tanstack/react-query'

import type { SkidParams } from './schema'
import { skidsService } from './service'

export const SKIDS_QUERY_KEYS = {
  all: () => ['skids'] as const,

  lists: () => [...SKIDS_QUERY_KEYS.all(), 'list'] as const,
  list: (params: SkidParams = {}) => [...SKIDS_QUERY_KEYS.lists(), params] as const,

  details: () => [...SKIDS_QUERY_KEYS.all(), 'detail'] as const,
  detail: (id: number) => [...SKIDS_QUERY_KEYS.details(), id] as const
}

export const getSkidsQueryOptions = (params: SkidParams = {}) =>
  queryOptions({
    queryKey: SKIDS_QUERY_KEYS.list(params),
    queryFn: () => skidsService.get(params)
  })

export const getSkidQueryOptions = (id: number) =>
  queryOptions({
    queryKey: SKIDS_QUERY_KEYS.detail(id),
    queryFn: () => skidsService.getById(id)
  })
