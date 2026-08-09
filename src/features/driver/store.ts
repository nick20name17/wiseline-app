import { createStore } from '@/store/create-store'

export type Stop = {
  id: number
  order: string
  customer: string
  address: string
  city: string
  pkgs: number
  /** Scanned off one at a time; the order only turns Delivered once this reaches `pkgs`. */
  deliveredPkgs: number
  status: string
}

export type DriverState = {
  started: boolean
  stops: Stop[]
}

/** Small enough to be written out rather than dumped — this page's whole seed is two stops. */
export const driverStore = createStore<DriverState>({
  started: false,
  stops: [
    {
      id: 1,
      order: '330618',
      customer: 'A.M.C.',
      address: '88 Industrial Dr, Tillsonburg',
      city: 'Tillsonburg',
      pkgs: 2,
      deliveredPkgs: 0,
      status: 'loaded'
    },
    {
      id: 2,
      order: '330630',
      customer: 'Port Dover Builders',
      address: '14 Main St, Port Dover',
      city: 'Port Dover',
      pkgs: 2,
      deliveredPkgs: 0,
      status: 'loaded'
    }
  ]
})

/** Truck 104's home base — Warehouse #2, the same coordinates Shipping routes from. */
const WAREHOUSE_COORD = { lat: 42.8339, lng: -80.3038 }

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Tillsonburg: { lat: 42.8654, lng: -80.7332 },
  'Port Dover': { lat: 42.7825, lng: -80.1968 }
}

const cityCoord = (city: string) => CITY_COORDS[city] ?? WAREHOUSE_COORD

const haversineMiles = (a: typeof WAREHOUSE_COORD, b: typeof WAREHOUSE_COORD) => {
  const R = 3958.8
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/** Leg by leg, warehouse → stop 1 → stop 2, so the miles shift when the sequence is reordered. */
export const computeLegMiles = (stops: Stop[]) => {
  const points = [WAREHOUSE_COORD, ...stops.map(stop => cityCoord(stop.city))]
  return stops.map(
    (_, index) => Math.round(haversineMiles(points[index]!, points[index + 1]!) * 10) / 10
  )
}

/**
 * These take the state rather than reading the store, deliberately. A function that reads `get()` has
 * no arguments, so the React Compiler is free to call it once and keep the answer — the route header
 * stayed on "Loading" after the route started, and the gate read it as changed text.
 */
export const deliveredCount = (state: DriverState) =>
  state.stops.filter(stop => stop.status === 'delivered').length

export const routeStatus = (state: DriverState) => {
  if (state.stops.every(stop => stop.status === 'delivered')) return 'Delivered'
  return state.started ? 'Shipping' : 'Loading'
}

/** The stop the driver is on: the first one not yet delivered, and only once the route has started. */
export const firstActiveId = (state: DriverState) => {
  if (!state.started) return null
  return state.stops.find(stop => stop.status !== 'delivered')?.id ?? null
}
