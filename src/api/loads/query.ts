import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { UseUpsertProps } from '../types'

import type { LoadsSearchParams } from './schema'
import { loadsService } from './service'

export const LOADS_QUERY_KEYS = {
  all: () => ['loads'] as const,

  list: (params: LoadsSearchParams = {}) => [...LOADS_QUERY_KEYS.all(), 'list', params] as const,
  lists: () => [...LOADS_QUERY_KEYS.all(), 'lists'] as const,

  details: () => [...LOADS_QUERY_KEYS.all(), 'details'] as const,
  detail: (id: number) => [...LOADS_QUERY_KEYS.details(), 'detail', id] as const
}

export const getLoadsQueryOptions = (params: LoadsSearchParams = {}) =>
  queryOptions({
    queryKey: LOADS_QUERY_KEYS.list(params),
    queryFn: () => loadsService.get(params)
  })

export const getLoadQueryOptions = (id: number) =>
  queryOptions({
    queryKey: LOADS_QUERY_KEYS.detail(id),
    queryFn: () => loadsService.getById(id)
  })

export const useCreateLoad = ({ onError, onSuccess }: UseUpsertProps = {}) => {
  const queryClient = useQueryClient()

  const createLoadMutation = useMutation({
    mutationFn: loadsService.create,
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOADS_QUERY_KEYS.all() })
      onSuccess?.()
    }
  })

  return {
    handleCreateLoad: createLoadMutation.mutate,
    isPending: createLoadMutation.isPending,
    isError: createLoadMutation.isError
  }
}

export const useUpdateLoad = ({ onError, onSuccess }: UseUpsertProps = {}) => {
  const queryClient = useQueryClient()

  const createLoadMutation = useMutation({
    mutationFn: loadsService.update,
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOADS_QUERY_KEYS.all() })
      onSuccess?.()
    }
  })

  return {
    handleUpdateLoad: createLoadMutation.mutate,
    isPending: createLoadMutation.isPending,
    isError: createLoadMutation.isError
  }
}

export const useUpdateShippedLoad = () => {
  const createLoadMutation = useMutation({
    mutationFn: loadsService.isShippedMultiUpdate,
    onSuccess: (_, __, ___, context) => {
      context.client.invalidateQueries({ queryKey: LOADS_QUERY_KEYS.all() })
      // toast.success('Marked as loaded successfully')
    }
  })

  return createLoadMutation
}
