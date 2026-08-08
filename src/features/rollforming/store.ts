import { createStore } from '@/store/create-store'

import seed from './seed.json'

import type { RollformingState } from './types'

/** The prototype pins its own clock; every date in the seed is relative to this one. */
export const TODAY = '2026-07-15'

/** Rollforming is department 02; the code shows in the header chip and prefixes every barcode. */
export const DEPARTMENT = 'Rollforming'

/** Production date capacity, in linear feet. */
export const CAP_PER_DAY = 6000

/**
 * `seed.json` is the prototype's own `store.get()`, dumped rather than retyped — see
 * `tools/port/dump-seed.ts`. A quarter of the review comments anchor to ids built out of it.
 */
export const rollformingStore = createStore<RollformingState>(seed as unknown as RollformingState)

export const setSearch = (searchTerm: string) => rollformingStore.set({ searchTerm })

export const setActiveGroup = (activeGroup: string) => rollformingStore.set({ activeGroup })

export const toggleExpand = (orderId: number) =>
  rollformingStore.set(state => ({
    expandedIds: state.expandedIds.includes(orderId)
      ? state.expandedIds.filter(id => id !== orderId)
      : [...state.expandedIds, orderId]
  }))

export const toggleOrderSelect = (orderId: number) =>
  rollformingStore.set(state => ({
    selectedOrderIds: state.selectedOrderIds.includes(orderId)
      ? state.selectedOrderIds.filter(id => id !== orderId)
      : [...state.selectedOrderIds, orderId]
  }))

export const setPriority = (orderId: number, priorityId: number | null) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order => (order.id === orderId ? { ...order, priorityId } : order))
  }))

/** Picking lines for a split belongs to one order at a time; a pick on another order replaces it. */
export const toggleLineSelect = (orderId: number, lineId: number) =>
  rollformingStore.set(state => {
    const ids = state.splitOrderId === orderId ? state.selectedLineIds : []
    const next = ids.includes(lineId) ? ids.filter(id => id !== lineId) : [...ids, lineId]
    return { splitOrderId: orderId, selectedLineIds: next }
  })

export const toggleSortByProductId = (orderId: number) =>
  rollformingStore.set(state => ({
    sortByProductId: {
      ...state.sortByProductId,
      [orderId]: !state.sortByProductId[orderId]
    }
  }))

/**
 * Ticking a unit for assignment. The selection belongs to one order *and one profile* — a coil serves
 * one profile, so ticking a unit of another replaces the selection rather than adding to it.
 */
export const toggleCoilUnitSelect = (orderId: number, lineId: number, coilIdx: number) => {
  const order = rollformingStore.get().orders.find(candidate => candidate.id === orderId)
  const item = order?.lineItems.find(candidate => candidate.id === lineId)
  if (!item) return

  const key = `${lineId}:${coilIdx}`
  rollformingStore.set(state => {
    const ctx = state.selectedCoilCtx
    if (!ctx || ctx.orderId !== orderId || ctx.profile !== item.profile)
      return { selectedCoilCtx: { orderId, profile: item.profile, units: [key] } }

    const units = ctx.units.includes(key)
      ? ctx.units.filter(unit => unit !== key)
      : [...ctx.units, key]
    return { selectedCoilCtx: units.length ? { orderId, profile: item.profile, units } : null }
  })
}

/** Picking Export picks Release with it: an order cannot be exported without going to production. */
export const toggleExportSel = (orderId: number) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== orderId || !order.reviewed || order.released) return order
      const on = !order.exportSel
      return { ...order, exportSel: on, releaseSel: on ? true : order.releaseSel }
    })
  }))

/** Dropping Release drops Export with it, for the same reason. */
export const toggleReleaseSel = (orderId: number) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== orderId || !order.reviewed || order.released) return order
      const on = !order.releaseSel
      return { ...order, releaseSel: on, exportSel: on ? order.exportSel : false }
    })
  }))

export const setScheduledDay = (scheduledDay: string) => rollformingStore.set({ scheduledDay })
