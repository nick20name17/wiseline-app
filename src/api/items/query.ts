import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ORDERS_QUERY_KEYS } from '../orders/query'
import { ORIGIN_ITEMS_QUERY_KEYS } from '../origin-items/query'
import type { UseUpsertProps } from '../types'

import type { UpdateItemsPayload } from './schema'
import { itemsService } from './service'

export const useUpsertItem = (
  {
    onError,
    onSuccess,
    withoutInvalidation
  }: UseUpsertProps & { withoutInvalidation?: boolean } = {
    withoutInvalidation: false
  }
) => {
  const queryClient = useQueryClient()

  const createItemMutation = useMutation({
    mutationFn: itemsService.create,
    onError
  })

  const updateItemMutation = useMutation({
    mutationFn: itemsService.update,
    onError
  })

  // Promise.allSettled style (can support single or batch if you pass an array)
  const handleUpsertItem = async (items: UpdateItemsPayload | UpdateItemsPayload[]) => {
    const list = Array.isArray(items) ? items : [items]

    const tasks = list.map(({ id, payload }) =>
      id ? updateItemMutation.mutateAsync({ id, payload }) : createItemMutation.mutateAsync(payload)
    )

    // Prevents one failure from stopping all mutations
    const results = await Promise.allSettled(tasks)

    const hasError = results.some((r) => r.status === 'rejected')

    if (hasError) {
      // Let react-query individual onError handle errors
      toast.error('Some items failed to update')
      return
    }

    onSuccess?.()
    toast.success('Updated successfully')

    // Always invalidate the order detail(s) touched
    const orderIds = Array.from(new Set(list.map(({ payload }) => payload.order)))
    await Promise.all(
      orderIds.map((orderId) =>
        queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEYS.detail(orderId) })
      )
    )

    // Optional broader invalidation (mirrors your existing behavior)
    if (!withoutInvalidation) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEYS.lists() }),
        queryClient.invalidateQueries({ queryKey: ORIGIN_ITEMS_QUERY_KEYS.lists() })
      ])
    }
  }

  return {
    handleUpsertItem,
    isError: createItemMutation.isError || updateItemMutation.isError,
    isPending: createItemMutation.isPending || updateItemMutation.isPending
  }
}
