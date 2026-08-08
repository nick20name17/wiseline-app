import { pkgHash } from './selectors'

import type { Order } from './types'

/**
 * Approximate southwestern-Ontario town centres. Real geocoding is out of scope for a mock; these
 * keep distances and ETAs plausible, and — the point of them — actually change when a route is
 * reordered.
 */
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Tillsonburg: { lat: 42.8654, lng: -80.7332 },
  Simcoe: { lat: 42.8339, lng: -80.3038 },
  Delhi: { lat: 42.8662, lng: -80.5079 },
  'Port Dover': { lat: 42.7825, lng: -80.1968 },
  Waterford: { lat: 42.9337, lng: -80.3138 },
  Aylmer: { lat: 42.7736, lng: -80.9634 },
  'Stoney Creek': { lat: 43.2168, lng: -79.7674 },
  Oakville: { lat: 43.4675, lng: -79.6877 },
  Langton: { lat: 42.7328, lng: -80.4823 },
  Vienna: { lat: 42.6836, lng: -80.7929 },
  Courtland: { lat: 42.8467, lng: -80.6335 },
  Hamilton: { lat: 43.2557, lng: -79.8711 },
  'Long Point': { lat: 42.579, lng: -80.053 }
}

export const WAREHOUSE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Warehouse #1': { lat: 42.8654, lng: -80.7332 },
  'Warehouse #2': { lat: 42.8339, lng: -80.3038 }
}

export const WAREHOUSE_COORD: [number, number] = [
  WAREHOUSE_COORDS['Warehouse #1']!.lat,
  WAREHOUSE_COORDS['Warehouse #1']!.lng
]

export const MAP_CATS = [
  { id: 'unscheduled', label: 'Unscheduled' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'loading', label: 'Loading' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'pickup', label: 'Pickup' }
] as const

export type MapCat = (typeof MAP_CATS)[number]['id']

/** Where an order sits in the pipeline, which is what its pin's colour says. */
export const orderMapCat = (order: Order): MapCat => {
  if (order.status === 'delivered') return 'delivered'
  if (order.status === 'shipping') return 'shipping'
  if (order.status === 'loaded' || order.status === 'loading') return 'loading'
  if (order.pickup) return 'pickup'
  if (order.shipDate) return 'scheduled'
  return 'unscheduled'
}

/** An order's pin, jittered off its town centre — deterministically, so stops in one town don't stack. */
export const coordsOf = (order: Order): [number, number] | null => {
  const base = CITY_COORDS[order.city]
  if (!base) return null

  const hash = pkgHash(order.order, 7)
  return [
    base.lat + ((hash % 100) / 100 - 0.5) * 0.03,
    base.lng + ((Math.floor(hash / 100) % 100) / 100 - 0.5) * 0.03
  ]
}
