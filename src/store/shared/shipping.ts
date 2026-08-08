import * as z from 'zod'

import { persisted } from '@/store/persisted'

/**
 * What Shipping knows, as the production departments see it.
 *
 * Owned by the shipping, scanner, loading and driver screens; every production department reads it and
 * none writes it. A package's `loaded` flag is the interesting one — once Shipping scans an order's
 * last package onto a truck, the warehouse location holding that order starts its release countdown
 * from *that* moment rather than from when the order was put there.
 */
const PackageSchema = z.object({ loaded: z.boolean().optional() }).loose()

const ShipStateSchema = z
  .object({
    /** Keyed by barcode — `<dept>-<order>-<seq>`, e.g. `01-338001-02`. */
    packages: z.record(z.string(), PackageSchema).optional()
  })
  .loose()

export type ShipState = z.infer<typeof ShipStateSchema>

export const shipState = persisted<ShipState, ShipState>({
  key: 'wl_ship_state_v1',
  schema: ShipStateSchema,
  fallback: () => ({}),
  decode: stored => stored,
  encode: value => value
})

/**
 * Whether Shipping has this barcode on a truck. `null` means Shipping has never seen it — which is not
 * the same as "not loaded", and the countdown treats the two differently.
 */
export const isPackageLoaded = (barcode: string) => {
  const record = shipState.get().packages?.[barcode]
  return record ? !!record.loaded : null
}
