import type { LoadRoute } from '@/api/routes/schema'

export interface Route {
  id: number
  name: string
  point: L.LatLng | null
  route: LoadRoute
}
