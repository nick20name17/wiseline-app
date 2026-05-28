import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ORDERS_QUERY_KEYS } from '../orders/query'
import type { UseUpsertProps } from '../types'

import { salesOrdersService } from './service'
import type { SalesOrdersUpdatePayload } from './types'

export const useUpsertSalesOrder = ({ onError, onSuccess }: UseUpsertProps) => {
  const queryClient = useQueryClient()

  const createSalesOrderMutation = useMutation({
    mutationFn: salesOrdersService.create,
    mutationKey: ['create-sales-order'],
    onError
  })

  const updateSalesOrderMutation = useMutation({
    mutationFn: salesOrdersService.update,
    mutationKey: ['update-sales-order'],
    onError
  })

  const handleUpsertSalesOrders = async (items: SalesOrdersUpdatePayload[]) => {
    const tasks = items.map(({ id, payload }) =>
      id
        ? updateSalesOrderMutation.mutateAsync({ id, payload })
        : createSalesOrderMutation.mutateAsync(payload)
    )

    // Prevents one failure from stopping all mutations
    const results = await Promise.allSettled(tasks)

    const hasError = results.some((r) => r.status === 'rejected')

    if (hasError) {
      // Let react-query individual onError handle errors
      // toast.error('Some items failed to update')
      return
    }

    onSuccess?.()
    toast.success('Successfully updated')

    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEYS.lists() })
  }

  return {
    handleUpsertSalesOrders,
    isError: createSalesOrderMutation.isError || updateSalesOrderMutation.isError,
    isPending: createSalesOrderMutation.isPending || updateSalesOrderMutation.isPending
  }
}
