import { api } from '..'

import type { GeocodeParams, GeocodeResponse } from './schema'

export const geocodeService = {
  get: async (params: GeocodeParams) => {
    const { data } = await api.get<GeocodeResponse>('/api-services/?service=geocode', { params })
    return data
  }
}

// const url = `https://nominatim.openstreetmap.org/search`

// export const geocode = async ({ city, country, state, limit = 1, street }: GeocodeParams) => {
//   try {
//     const { data } = await axios.get<GeocodeResponse[]>(url, {
//       params: {
//         format: 'json',
//         city,
//         country,
//         state,
//         street,
//         limit
//       }
//     })

//     if (!Array.isArray(data) || data.length === 0) return null

//     return {
//       lat: Number(data[0].lat),
//       lng: Number(data[0].lon)
//     }
//   } catch {
//     return null
//   }
// }

// export const geocodeService = {
//   get: geocode
// }
