import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ORDERS_QUERY_KEYS } from '../orders/query'
import { ORIGIN_ITEMS_QUERY_KEYS } from '../origin-items/query'
import type { OriginItem } from '../origin-items/schema'
import type { UseUpsertProps } from '../types'

import type { UpdateRemanufacturingPayload } from './schema'
import { remanufacturingService } from './service'

export const useUpsertRemanufacturing = ({
  onError,
  onSuccess,
  originItem
}: UseUpsertProps & { originItem: OriginItem }) => {
  const queryClient = useQueryClient()

  const onSuccessCallback = () => {
    onSuccess?.()
    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEYS.all() })
    queryClient.invalidateQueries({ queryKey: ORIGIN_ITEMS_QUERY_KEYS.all() })
    toast.success('Successfully updated')
  }

  const createRemanufacturingMutation = useMutation({
    mutationFn: remanufacturingService.create,
    onError,
    onSuccess: onSuccessCallback
  })

  const updateRemanufacturingMutation = useMutation({
    mutationFn: remanufacturingService.update,
    onError,
    onSuccess: onSuccessCallback
  })

  const handleUpsertRemanufacturing = ({
    autoid,
    status,
    payload
  }: UpdateRemanufacturingPayload) => {
    if (originItem.remanufacturing_from_stock_qty > 0 || originItem.remanufacturing_qty > 0) {
      updateRemanufacturingMutation.mutate({ autoid, status, payload })
    } else {
      createRemanufacturingMutation.mutate(payload)
    }
  }

  return {
    handleUpsertRemanufacturing,
    isError: createRemanufacturingMutation.isError || updateRemanufacturingMutation.isError,
    isPending: createRemanufacturingMutation.isPending || updateRemanufacturingMutation.isPending
  }
}
