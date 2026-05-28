import { queryOptions } from '@tanstack/react-query'

import type { PackagesParams } from './schema'
import { packageService } from './service'

export const PACKAGES_QUERY_KEYS = {
  all: () => ['packages'] as const,

  lists: () => [...PACKAGES_QUERY_KEYS.all(), 'list'] as const,
  list: (params: PackagesParams = {}) => [...PACKAGES_QUERY_KEYS.lists(), params] as const,

  details: () => [...PACKAGES_QUERY_KEYS.all(), 'detail'] as const,
  detail: (id: number) => [...PACKAGES_QUERY_KEYS.details(), id] as const
}

export const getPackagesQueryOptions = (params: PackagesParams = {}) =>
  queryOptions({
    queryKey: PACKAGES_QUERY_KEYS.list(params),
    queryFn: () => packageService.get(params)
  })
