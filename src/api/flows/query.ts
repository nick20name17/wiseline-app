import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { CATEGORIES_QUERY_KEYS } from '../categories/query'
import type { UseUpsertProps } from '../types'

import type { FlowsSearchParams, UpdateFlowPayload } from './schema'
import { flowsService } from './service'

export const FLOWS_QUERY_KEYS = {
  all: () => ['flows'] as const,

  lists: () => [...FLOWS_QUERY_KEYS.all(), 'list'] as const,
  list: (params: FlowsSearchParams = {}) => [...FLOWS_QUERY_KEYS.lists(), params] as const
}

export const getFlowsQueryOptions = (params: FlowsSearchParams = {}) => ({
  queryKey: FLOWS_QUERY_KEYS.list(params),
  queryFn: () => flowsService.get(params)
})

export const useUpsertFlow = ({ onError, onSuccess }: UseUpsertProps) => {
  const queryClient = useQueryClient()

  const createFlowMutation = useMutation({
    mutationFn: flowsService.create,
    onError,
    onSuccess: () => {
      toast.success('Successfully updated')
      queryClient.invalidateQueries({ queryKey: FLOWS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.lists() })
    }
  })

  const updateFlowMutation = useMutation({
    mutationFn: flowsService.update,
    onError,
    onSuccess: () => {
      toast.success('Successfully updated')
      queryClient.invalidateQueries({ queryKey: FLOWS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.lists() })
    }
  })

  const handleUpsertFlow = ({ id, payload }: UpdateFlowPayload) => {
    if (id) {
      updateFlowMutation.mutate({ id, payload }, { onSuccess })
    } else {
      createFlowMutation.mutate(payload, { onSuccess })
    }
  }

  return {
    handleUpsertFlow,
    isError: createFlowMutation.isError || updateFlowMutation.isError,
    isPending: createFlowMutation.isPending || updateFlowMutation.isPending
  }
}
