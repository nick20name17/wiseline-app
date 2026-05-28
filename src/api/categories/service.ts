import type { Category } from './schema'
import { api } from '@/api'

export const categoriesService = {
  getAll: async () => {
    const { data } = await api.get<Category[]>('/ebms/categories/all/')
    return data
  }
}
