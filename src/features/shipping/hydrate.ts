import { shipState } from '@/store/shared/shipping'

import { barcodeFor, loadKeyForLoad, orderById } from './selectors'
import { shippingStore } from './store'

import type { Load, LoadStatus, Order } from './types'

/**
 * The cross-page cascade, coming *in*.
 *
 * The Loading station, the scanner and the driver's screen all write `wl_ship_state_v1`; this page reads
 * it so a package scanned onto a truck two screens away shows up here. The merge only ever moves a
 * status *forwards* — two screens can write the same order, and without a rank the later write would
 * win rather than the further-along one, walking a delivered stop back to "loading".
 *
 * Whichever page is opened first seeds the slice from its own store, so a fresh browser is consistent
 * rather than empty.
 */

type SharedPackage = { loaded?: boolean; delivered?: boolean }
type SharedRecord = Record<string, unknown>

const ORDER_RANK: (LoadStatus | '')[] = [
  '',
  'notstarted',
  'loading',
  'loaded',
  'shipping',
  'delivered'
]
const LOAD_RANK = ['unreleased', 'notstarted', 'loading', 'loaded', 'shipping', 'shipped']

const orderRank = (status: string) => Math.max(0, ORDER_RANK.indexOf(status as LoadStatus))
const loadRank = (status: string) => LOAD_RANK.indexOf(status)

type Shared = {
  packages: Record<string, SharedPackage>
  orders: Record<string, { status?: string }>
  loads: Record<string, { status?: string }>
}

const read = (): Shared | null => {
  const state = shipState.get() as SharedRecord
  if (!state.packages && !state.orders && !state.loads) return null

  return {
    packages: (state.packages ?? {}) as Shared['packages'],
    orders: (state.orders ?? {}) as Shared['orders'],
    loads: (state.loads ?? {}) as Shared['loads']
  }
}

/** An order still blank has not been released yet, and must not adopt a cascaded pill. */
const mergeOrder = (order: Order, shared: Shared): Order => {
  if (order.status === '') return order

  const total = order.packages.length
  let loadedCount = 0
  let deliveredCount = 0
  let anyEvidence = false

  const packages = order.packages.map((pkg, index) => {
    const record = shared.packages[barcodeFor(order.order, index + 1)]
    let loaded = !!pkg.loaded
    let delivered = !!pkg.delivered

    if (record) {
      anyEvidence = true
      if (typeof record.loaded === 'boolean') loaded = record.loaded
      if (typeof record.delivered === 'boolean') delivered = record.delivered
    }
    if (loaded) loadedCount++
    if (delivered) deliveredCount++

    return { ...pkg, loaded, delivered }
  })

  let derived: string | null = null
  if (total > 0) {
    if (deliveredCount === total) derived = 'delivered'
    else if (loadedCount === total) derived = 'loaded'
    else if (loadedCount > 0) derived = 'loading'
  }

  const explicit = shared.orders[order.order]?.status
  if (explicit) anyEvidence = true
  // no cross-page evidence at all: leave the order exactly as it was
  if (!anyEvidence) return order

  const best = Math.max(
    orderRank(order.status),
    derived ? orderRank(derived) : 0,
    explicit ? orderRank(explicit) : 0
  )

  return { ...order, packages, status: ORDER_RANK[best] ?? order.status }
}

const mergeLoad = (load: Load, shared: Shared, loads: Load[]): Load => {
  if (load.status === 'unreleased') return load

  const key = loadKeyForLoad(load, loads)
  if (!key) return load

  const status = shared.loads[key]?.status
  if (!status || loadRank(status) <= loadRank(load.status)) return load

  return {
    ...load,
    status: status as LoadStatus,
    is_loaded: load.is_loaded || loadRank(status) >= loadRank('loaded'),
    is_shipped: load.is_shipped || status === 'shipped'
  }
}

export const hydrateFromShared = () => {
  const shared = read()

  if (!shared) {
    const state = shippingStore.get()
    const packages: Shared['packages'] = {}
    const orders: Shared['orders'] = {}
    const loads: Record<string, { status: string; sequence: string[] }> = {}

    for (const order of state.orders) {
      if (order.status) orders[order.order] = { status: order.status }
      order.packages.forEach((pkg, index) => {
        packages[barcodeFor(order.order, index + 1)] = {
          loaded: !!pkg.loaded,
          delivered: !!pkg.delivered
        }
      })
    }

    for (const load of state.loads) {
      const key = loadKeyForLoad(load, state.loads)
      if (!key) continue
      loads[key] = {
        status: load.status,
        sequence: load.sequence
          .map(id => orderById(id, state.orders)?.order)
          .filter((orderNumber): orderNumber is string => !!orderNumber)
      }
    }

    shipState.set({ ...shipState.get(), packages, orders, loads })
    return
  }

  const state = shippingStore.get()
  shippingStore.set({
    orders: state.orders.map(order => mergeOrder(order, shared)),
    loads: state.loads.map(load => mergeLoad(load, shared, state.loads))
  })
}
