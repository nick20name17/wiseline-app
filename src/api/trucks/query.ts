import { queryOptions, useMutation } from '@tanstack/react-query'

import type { UseUpsertProps } from '../types'

import type { TrucksSearchParams, UpdateTruckPayload } from './schema'
import { trucksService } from './service'

export const TRUCKS_QUERY_KEYS = {
  all: () => ['trucks'] as const,

  lists: () => [...TRUCKS_QUERY_KEYS.all(), 'list'] as const,
  list: (params: TrucksSearchParams = {}) => [...TRUCKS_QUERY_KEYS.lists(), params] as const,

  details: () => [...TRUCKS_QUERY_KEYS.all(), 'detail'] as const,
  detail: (id: number) => [...TRUCKS_QUERY_KEYS.details(), id] as const
}

export const getTrucksQueryOptions = (params: TrucksSearchParams = {}) =>
  queryOptions({
    queryKey: TRUCKS_QUERY_KEYS.list(params),
    queryFn: () => trucksService.get(params)
  })

export const getTruckQueryOptions = (id: number) =>
  queryOptions({
    queryKey: TRUCKS_QUERY_KEYS.detail(id),
    queryFn: () => trucksService.getById(id)
  })

export const useUpsertTruck = ({ onError, onSuccess }: UseUpsertProps) => {
  const createTruckMutation = useMutation({
    mutationFn: trucksService.create,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: TRUCKS_QUERY_KEYS.lists()
    }
  })

  const updateTruckMutation = useMutation({
    mutationFn: trucksService.update,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: TRUCKS_QUERY_KEYS.lists()
    }
  })

  const handleUpsertTruck = ({ id, payload }: UpdateTruckPayload) => {
    if (id) {
      updateTruckMutation.mutate({ id, payload }, { onSuccess })
    } else {
      createTruckMutation.mutate(payload, { onSuccess })
    }
  }

  return {
    handleUpsertTruck,
    isError: createTruckMutation.isError || updateTruckMutation.isError,
    isPending: createTruckMutation.isPending || updateTruckMutation.isPending
  }
}
