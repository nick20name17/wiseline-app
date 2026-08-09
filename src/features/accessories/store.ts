import { createStore } from '@/store/create-store'

import seed from './seed.json'

import type { AccessoriesState } from './types'

/** The prototype pins its own clock; every date in the seed is relative to this one. */
export const TODAY = '2026-07-15'

export const DEPARTMENT = 'Accessories'

/** `seed.json` is the prototype's own `store.get()`, dumped rather than retyped — `tools/port/dump-seed.ts`. */
export const accessoriesStore = createStore<AccessoriesState>(seed as unknown as AccessoriesState)

export const setSearch = (search: string) => accessoriesStore.set({ search })

export const toggleExpand = (orderId: number) =>
  accessoriesStore.set(state => ({
    expandedIds: state.expandedIds.includes(orderId)
      ? state.expandedIds.filter(id => id !== orderId)
      : [...state.expandedIds, orderId]
  }))

export const toggleOrderSelect = (orderId: number) =>
  accessoriesStore.set(state => ({
    selectedOrderIds: state.selectedOrderIds.includes(orderId)
      ? state.selectedOrderIds.filter(id => id !== orderId)
      : [...state.selectedOrderIds, orderId]
  }))

/**
 * Line selection belongs to one order at a time: picking a line in another order clears the set,
 * because only one order can be mid-split.
 */
export const toggleLineSelect = (orderId: number, lineId: number) =>
  accessoriesStore.set(state => {
    const current = state.splitOrderId === orderId ? state.selectedLineIds : []
    const next = current.includes(lineId)
      ? current.filter(id => id !== lineId)
      : [...current, lineId]
    return { splitOrderId: next.length ? orderId : null, selectedLineIds: next }
  })

export const setScheduledDay = (day: string) => accessoriesStore.set({ scheduledDay: day })

export const setPriority = (orderId: number, priorityId: number | null) =>
  accessoriesStore.set(state => ({
    orders: state.orders.map(order => (order.id === orderId ? { ...order, priorityId } : order))
  }))
