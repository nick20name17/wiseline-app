// import { queryOptions } from '@tanstack/react-query'
// import type { GeocodeParams } from './schema'
// import { geocodeService } from './service'
// export const GEOCODE_QUERY_KEYS = {
//   all: () => ['geocode'] as const,
//   details: () => [...GEOCODE_QUERY_KEYS.all(), 'detail'] as const,
//   detail: (address: GeocodeParams) => [...GEOCODE_QUERY_KEYS.details(), address] as const
// }
// export const getGeocodeQueryOptions = (address: GeocodeParams) =>
//   queryOptions({
//     queryKey: GEOCODE_QUERY_KEYS.detail(address),
//     queryFn: () => geocodeService.get(address)
//   })
import { queryOptions } from '@tanstack/react-query'

import type { GeocodeParams } from './schema'
import { geocodeService } from './service'

export const GEOCODE_QUERY_KEYS = {
  all: () => ['geocode'] as const,

  details: () => [...GEOCODE_QUERY_KEYS.all(), 'detail'] as const,

  detail: (address: GeocodeParams) => [...GEOCODE_QUERY_KEYS.details(), address] as const
}

export const getGeocodeQueryOptions = (address: GeocodeParams) =>
  queryOptions({
    queryKey: GEOCODE_QUERY_KEYS.detail(address),
    queryFn: () => geocodeService.get(address)
  })
