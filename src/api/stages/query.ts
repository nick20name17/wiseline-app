import { useMutation } from '@tanstack/react-query'

import type { UseUpsertProps } from '../types'

import type { StagesSearchParams, UpdateStagePayload } from './schema'
import { stagesService } from './service'

const STAGES_QUERY_KEYS = {
  all: () => ['stages'] as const,

  lists: () => [...STAGES_QUERY_KEYS.all(), 'list'] as const,
  list: (params: StagesSearchParams = {}) => [...STAGES_QUERY_KEYS.lists(), params] as const
}

export const getStagesQueryOptions = (params: StagesSearchParams = {}) => ({
  queryKey: STAGES_QUERY_KEYS.list(params),
  queryFn: () => stagesService.get(params)
})

export const useUpsertStage = ({ onError, onSuccess }: UseUpsertProps) => {
  const createStageMutation = useMutation({
    mutationFn: stagesService.create,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: STAGES_QUERY_KEYS.lists()
    }
  })

  const updateStageMutation = useMutation({
    mutationFn: stagesService.update,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: STAGES_QUERY_KEYS.lists()
    }
  })

  const handleUpsertStage = ({ id, payload }: UpdateStagePayload) => {
    if (id) {
      updateStageMutation.mutate({ id, payload }, { onSuccess })
    } else {
      createStageMutation.mutate(payload, { onSuccess })
    }
  }

  return {
    handleUpsertStage,
    isError: createStageMutation.isError || updateStageMutation.isError,
    isPending: createStageMutation.isPending || updateStageMutation.isPending
  }
}
