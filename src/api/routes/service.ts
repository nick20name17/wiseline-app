import { api } from '..'

import type { LoadRoute, UpdateLoadRoutePayload } from './schema'

export const routesService = {
  update: async ({ id, payload }: UpdateLoadRoutePayload) => {
    const { data } = await api.patch<LoadRoute>(`/routes/${id}/`, payload)

    return data
  }
}
