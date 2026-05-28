import { queryOptions, useMutation } from '@tanstack/react-query'

import type { UseUpsertProps } from '../types'

import type { UpdatePriorityPayload } from './schema'
import { prioritiesService } from './service'

export const PRIORITIES_QUERY_KEYS = {
  all: () => ['priorities'] as const,

  lists: () => [...PRIORITIES_QUERY_KEYS.all(), 'list'] as const,
  list: () => [...PRIORITIES_QUERY_KEYS.lists()] as const
}

export const getPrioritiesQueryOptions = () =>
  queryOptions({
    queryKey: PRIORITIES_QUERY_KEYS.list(),
    queryFn: () => prioritiesService.get()
  })

export const useUpsertPriority = ({ onError, onSuccess }: UseUpsertProps) => {
  const createPriorityMutation = useMutation({
    mutationFn: prioritiesService.create,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: PRIORITIES_QUERY_KEYS.lists()
    }
  })

  const updatePriorityMutation = useMutation({
    mutationFn: prioritiesService.update,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: PRIORITIES_QUERY_KEYS.lists()
    }
  })

  const handleUpsertPriority = ({ id, payload }: UpdatePriorityPayload) => {
    if (id) {
      updatePriorityMutation.mutate({ id, payload }, { onSuccess })
    } else {
      createPriorityMutation.mutate(payload, { onSuccess })
    }
  }

  return {
    handleUpsertPriority,
    isError: createPriorityMutation.isError || updatePriorityMutation.isError,
    isPending: createPriorityMutation.isPending || updatePriorityMutation.isPending
  }
}
