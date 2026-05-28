import { queryOptions, useMutation } from '@tanstack/react-query'

import type { UseUpsertProps } from '../types'

import type { LocationsSearchParams, UpdateLocationsPayload } from './schema'
import { locationsService } from './service'

export const LOCATIONS_QUERY_KEYS = {
  all: () => ['locations'] as const,

  lists: () => [...LOCATIONS_QUERY_KEYS.all(), 'list'] as const,
  list: (params: LocationsSearchParams = {}) => [...LOCATIONS_QUERY_KEYS.lists(), params] as const
}

export const getLocationsQueryOptions = (params: LocationsSearchParams = {}) =>
  queryOptions({
    queryKey: LOCATIONS_QUERY_KEYS.list(params),
    queryFn: () => locationsService.get(params)
  })

export const useUpsertLocation = ({ onError, onSuccess }: UseUpsertProps) => {
  const createLocationMutation = useMutation({
    mutationFn: locationsService.create,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: LOCATIONS_QUERY_KEYS.lists()
    }
  })

  const updateLocationMutation = useMutation({
    mutationFn: locationsService.update,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: LOCATIONS_QUERY_KEYS.lists()
    }
  })

  const handleUpsertLocation = ({ id, payload }: UpdateLocationsPayload) => {
    if (id) {
      updateLocationMutation.mutate({ id, payload }, { onSuccess })
    } else {
      createLocationMutation.mutate(payload, { onSuccess })
    }
  }

  return {
    handleUpsertLocation,
    isError: createLocationMutation.isError || updateLocationMutation.isError,
    isPending: createLocationMutation.isPending || updateLocationMutation.isPending
  }
}
