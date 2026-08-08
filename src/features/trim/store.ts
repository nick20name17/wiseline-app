import { createStore } from '@/store/create-store'
import { withPublishedCaps } from '@/store/shared/settings'

import seed from './seed.json'

import type { TrimState } from './types'

/**
 * The prototype pins its own clock so the demo reads the same on any day it is opened. Every date in
 * the seed is relative to this one, and the day strips walk forward from it.
 */
export const TODAY = '2026-07-14'

/** Trim is department 01; the code shows in the header chip and prefixes every package barcode. */
export const DEPARTMENT = 'Trim'

/**
 * `seed.json` is the prototype's own `store.get()`, dumped rather than retyped — see
 * `tools/port/dump-seed.ts`. Machine capacities are the one part of it Settings may have overridden
 * since, so they are re-read on load exactly as the prototype re-reads them.
 */
export const trimStore = createStore<TrimState>({
  ...(seed as unknown as TrimState),
  machines: withPublishedCaps(DEPARTMENT, (seed as unknown as TrimState).machines)
})

export const setSearch = (searchTerm: string) => trimStore.set({ searchTerm })

export const toggleExpand = (orderId: number) =>
  trimStore.set(state => ({
    expandedIds: state.expandedIds.includes(orderId)
      ? state.expandedIds.filter(id => id !== orderId)
      : [...state.expandedIds, orderId]
  }))

export const toggleOrderSelect = (orderId: number) =>
  trimStore.set(state => ({
    selectedOrderIds: state.selectedOrderIds.includes(orderId)
      ? state.selectedOrderIds.filter(id => id !== orderId)
      : [...state.selectedOrderIds, orderId]
  }))

export const setPriority = (orderId: number, priorityId: number | null) =>
  trimStore.set(state => ({
    orders: state.orders.map(order => (order.id === orderId ? { ...order, priorityId } : order))
  }))

export const clearPeekDay = () => trimStore.set({ peekDay: null })
