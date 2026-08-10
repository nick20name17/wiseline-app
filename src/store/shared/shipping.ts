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

export const patchPackage = (barcode: string, fields: Record<string, unknown>) => {
  if (!barcode) return
  const state = shipState.get()
  const packages = { ...(state.packages ?? {}) }
  packages[barcode] = { ...packages[barcode], ...fields }
  shipState.set({ ...state, packages })
}

/**
 * Statuses only ever move forwards. Two screens can write the same order — the driver scanning a
 * package off and Shipping recomputing the load — and without a rank the later of the two writes wins
 * rather than the further-along one, which would walk a delivered stop back to "loading".
 */
const ORDER_RANK = ['notstarted', 'loading', 'loaded', 'shipping', 'delivered']
const LOAD_RANK = ['unreleased', 'notstarted', 'loading', 'loaded', 'shipping', 'shipped']

const advance = (ranks: string[], current: unknown, next: string) =>
  ranks.indexOf(next) >= ranks.indexOf(typeof current === 'string' ? current : '')

export const patchOrderStatus = (orderNumber: string, status: string) => {
  if (!orderNumber) return
  const state = shipState.get()
  const orders = { ...((state.orders as Record<string, { status?: string }>) ?? {}) }
  if (!advance(ORDER_RANK, orders[orderNumber]?.status, status)) return
  orders[orderNumber] = { ...orders[orderNumber], status }
  shipState.set({ ...state, orders })
}

export const patchLoadStatus = (loadKey: string, status: string) => {
  if (!loadKey) return
  const state = shipState.get()
  const loads = { ...((state.loads as Record<string, { status?: string }>) ?? {}) }
  if (!advance(LOAD_RANK, loads[loadKey]?.status, status)) return
  loads[loadKey] = { ...loads[loadKey], status }
  shipState.set({ ...state, loads })
}

/**
 * The stop order for a load, as order numbers rather than this page's ids.
 *
 * Unlike a status this is not ranked: the dispatcher dragging the stops around is the authority on the
 * route, and the last word wins.
 */
export const patchLoadSequence = (loadKey: string, orderNumbers: string[]) => {
  if (!loadKey) return
  const state = shipState.get()
  const loads = { ...((state.loads as Record<string, { sequence?: string[] }>) ?? {}) }
  loads[loadKey] = { ...loads[loadKey], sequence: orderNumbers }
  shipState.set({ ...state, loads })
}

export const loadStatusOf = (loadKey: string) => {
  const loads = shipState.get().loads as Record<string, { status?: string }> | undefined
  return loads?.[loadKey]?.status ?? null
}

export const loadRankOf = (status: string | null) => LOAD_RANK.indexOf(status ?? '')
