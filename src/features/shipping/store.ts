import { createStore } from '@/store/create-store'

import seed from './seed.json'

import type { ShippingState } from './types'

/** The prototype pins its own clock; every date in the seed is relative to this one. */
export const TODAY = '2026-07-14'

/** Shipping is dispatch rather than a numbered department, and its header chip says so. */
export const DEPARTMENT = 'Shipping'

/**
 * `seed.json` is the prototype's own `store.get()`, dumped rather than retyped — see
 * `tools/port/dump-seed.ts`. Twenty-three orders, four trucks, six loads.
 */
export const shippingStore = createStore<ShippingState>(seed as unknown as ShippingState)

export const setSearch = (search: string) => shippingStore.set({ search })

export const toggleNotesExpanded = () =>
  shippingStore.set(state => ({ notesExpanded: !state.notesExpanded }))

export const toggleUnschedSel = (orderId: number) =>
  shippingStore.set(state => ({
    selUnscheduled: state.selUnscheduled.includes(orderId)
      ? state.selUnscheduled.filter(id => id !== orderId)
      : [...state.selUnscheduled, orderId]
  }))

export const toggleUnschedExpand = (orderId: number) =>
  shippingStore.set(state => ({
    expUnscheduled: state.expUnscheduled.includes(orderId)
      ? state.expUnscheduled.filter(id => id !== orderId)
      : [...state.expUnscheduled, orderId]
  }))

export const setPriority = (orderId: number, priorityId: number | null) =>
  shippingStore.set(state => ({
    orders: state.orders.map(order => (order.id === orderId ? { ...order, priorityId } : order))
  }))
