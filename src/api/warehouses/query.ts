import { queryOptions, useMutation } from '@tanstack/react-query'

import type { UseUpsertProps } from '../types'

import type { UpdateWarehousesPayload, WarehousesSearchParams } from './schema'
import { warehousesService } from './service'

export const WAREHOUSES_QUERY_KEYS = {
  all: () => ['warehouses'] as const,

  lists: () => [...WAREHOUSES_QUERY_KEYS.all(), 'list'] as const,
  list: (params: WarehousesSearchParams = {}) => [...WAREHOUSES_QUERY_KEYS.lists(), params] as const
}

export const getWarehousesQueryOptions = (params: WarehousesSearchParams = {}) =>
  queryOptions({
    queryKey: WAREHOUSES_QUERY_KEYS.list(params),
    queryFn: () => warehousesService.get(params)
  })

export const useUpsertWarehouse = ({ onError, onSuccess }: UseUpsertProps) => {
  const createWarehouseMutation = useMutation({
    mutationFn: warehousesService.create,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: WAREHOUSES_QUERY_KEYS.lists()
    }
  })

  const updateWarehouseMutation = useMutation({
    mutationFn: warehousesService.update,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: WAREHOUSES_QUERY_KEYS.lists()
    }
  })

  const handleUpsertWarehouse = ({ id, payload }: UpdateWarehousesPayload) => {
    if (id) {
      updateWarehouseMutation.mutate({ id, payload }, { onSuccess })
    } else {
      createWarehouseMutation.mutate(payload, { onSuccess })
    }
  }

  return {
    handleUpsertWarehouse,
    isError: createWarehouseMutation.isError || updateWarehouseMutation.isError,
    isPending: createWarehouseMutation.isPending || updateWarehouseMutation.isPending
  }
}
