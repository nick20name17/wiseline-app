import { CITY_COORDS, WAREHOUSE_COORDS } from './map-data'
import { orderById, truckById } from './selectors'
import { shippingStore } from './store'

import type { Load, Order } from './types'

/**
 * The mock route engine: how far a load drives, and when it gets back.
 *
 * It has its own jitter, deliberately different from the map view's — the map spreads pins around a
 * town so they do not stack, while this spreads *stops* so two orders on the same street still make two
 * legs. Distances and the ETA are computed from the sequence in order, which is the whole point: drag a
 * stop and the legs, the mileage and the arrival time all change.
 */
const AVG_SPEED_MPH = 38
const UNLOAD_MIN_PER_STOP = 12

export type Point = { lat: number; lng: number }

const hashStr = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index++)
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  return Math.abs(hash)
}

/** A town the seed does not carry still gets a stable spot, so nothing lands at 0,0. */
const cityCoord = (city: string): Point => {
  const known = CITY_COORDS[city]
  if (known) return known

  const hash = hashStr(city || '?')
  return {
    lat: 42.8 + ((hash % 100) / 100 - 0.5) * 0.6,
    lng: -80.5 + ((Math.floor(hash / 100) % 100) / 100 - 0.5) * 0.9
  }
}

const orderCoord = (order: Order): Point => {
  const base = cityCoord(order.city)
  const hash = hashStr((order.address || '') + order.id)
  return {
    lat: base.lat + ((hash % 17) - 8) * 0.0035,
    lng: base.lng + ((Math.floor(hash / 17) % 17) - 8) * 0.0035
  }
}

const warehouseCoord = (location: string): Point =>
  WAREHOUSE_COORDS[location] ?? cityCoord(location)

const haversineMiles = (from: Point, to: Point) => {
  const radius = 3958.8
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export type RouteResult = { miles: number; orders: Order[]; points: Point[]; totalMin: number }

export const computeRoute = (load: Load, state = shippingStore.get()): RouteResult => {
  const truck = truckById(load.truckId, state.trucks)
  const orders = load.sequence
    .map(id => orderById(id, state.orders))
    .filter((order): order is Order => !!order)
  const points = [warehouseCoord(truck ? truck.location : ''), ...orders.map(orderCoord)]

  let miles = 0
  for (let index = 1; index < points.length; index++)
    miles += haversineMiles(points[index - 1] as Point, points[index] as Point)
  miles = Math.round(miles * 10) / 10

  const totalMin = (miles / AVG_SPEED_MPH) * 60 + orders.length * UNLOAD_MIN_PER_STOP
  return { miles, orders, points, totalMin }
}

/** Trucks leave at eight. A route long enough to run past midnight says so rather than wrapping. */
export const routeEtaLabel = (load: Load, totalMin: number) => {
  const [year = 0, month = 1, day = 1] = load.date.split('-').map(Number)
  const start = new Date(year, month - 1, day, 8, 0, 0)
  const end = new Date(start.getTime() + totalMin * 60000)

  const minutes = String(end.getMinutes()).padStart(2, '0')
  const meridiem = end.getHours() >= 12 ? 'PM' : 'AM'
  const hours = end.getHours() % 12 || 12

  return `${hours}:${minutes} ${meridiem}${end.getDate() !== start.getDate() ? ' (+1d)' : ''}`
}
