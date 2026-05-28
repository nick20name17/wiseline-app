import type { ApiResponse } from '../types'

import type { Order, OrdersSearchParams } from './schema'
import { api } from '@/api'

export const ordersService = {
  get: async (params: OrdersSearchParams = {}) => {
    const { data } = await api.get<ApiResponse<Order>>('/ebms/orders/', { params })
    return data
  },
  getById: async (id: string) => {
    const { data } = await api.get<Order>(`/ebms/orders/${id}/`)
    return data
  }
}
