import * as z from 'zod'

import { persisted } from '@/store/persisted'

/**
 * When each order arrived at each warehouse location, which is what the 15-minute release countdown
 * counts from.
 *
 * One store per department, deliberately. Trim, Rollforming, Accessories and the warehouse screen each
 * number their locations from 1, so a single shared key would have Trim's location 3 and Accessories'
 * location 3 overwriting each other's timestamps.
 *
 * Two kinds of entry live in the same map: `<loc>::<order>` is when the order was put there, and
 * `ship::<loc>::<order>` is when Shipping loaded its last package. The second wins when it exists.
 */
export type LocationScope = 'trim' | 'rf' | 'acc' | 'wh'

const StampsSchema = z.record(z.string(), z.number())

const stores = new Map<LocationScope, ReturnType<typeof makeStore>>()

const makeStore = (scope: LocationScope) =>
  persisted<Record<string, number>, Record<string, number>>({
    key: `wl_loc_release_${scope}_v1`,
    schema: StampsSchema,
    fallback: () => ({}),
    decode: stored => stored,
    encode: value => value
  })

export const releaseStamps = (scope: LocationScope) => {
  const existing = stores.get(scope)
  if (existing) return existing

  const store = makeStore(scope)
  stores.set(scope, store)
  return store
}

export const arrivalKey = (locationId: number | string, orderId: number | string) =>
  `${locationId}::${orderId}`

export const shippedKey = (locationId: number | string, orderId: number | string) =>
  `ship::${arrivalKey(locationId, orderId)}`

/** Both stamps for one occupant, for when an order leaves a location. */
export const forgetOccupant = (
  scope: LocationScope,
  locationId: number | string,
  orderId: number | string
) => {
  const store = releaseStamps(scope)
  const next = { ...store.get() }
  delete next[arrivalKey(locationId, orderId)]
  delete next[shippedKey(locationId, orderId)]
  store.set(next)
}
