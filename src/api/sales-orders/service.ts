import { api } from '..'

import type { SalesOrderCreatePayload, SalesOrdersUpdatePayload } from './types'

export const salesOrdersService = {
  create: async (payload: SalesOrderCreatePayload) => {
    const { data } = await api.post('/sales-orders/', payload)

    return data
  },
  update: async ({ id, payload }: SalesOrdersUpdatePayload) => {
    const { data } = await api.patch(`/sales-orders/${id}/`, payload)

    return data
  }
}
