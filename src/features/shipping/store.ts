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

/**
 * The Scheduled board's month picker, kept out of the page store because the prototype keeps it out
 * too — three loose `let`s beside the render function, not seed data, and nothing else reads them.
 */
export const schedCalStore = createStore({ month: 6, year: 2026, open: false })

export const toggleSchedCal = () => schedCalStore.set(state => ({ open: !state.open }))

export const schedCalShift = (delta: number) =>
  schedCalStore.set(state => {
    const shifted = state.month + delta
    if (shifted < 0) return { month: 11, year: state.year - 1 }
    if (shifted > 11) return { month: 0, year: state.year + 1 }
    return { month: shifted }
  })

/** Picking a day drops the truck expansion, the load filter and the selection with it. */
export const setSchedDay = (day: string) => {
  schedCalStore.set({ open: false })
  shippingStore.set({ scheduledDay: day, expTruck: null, loadFilter: null, selScheduled: [] })
}

export const setLoadingDay = (day: string) => shippingStore.set({ loadingDay: day })

export const setPriority = (orderId: number, priorityId: number | null) =>
  shippingStore.set(state => ({
    orders: state.orders.map(order => (order.id === orderId ? { ...order, priorityId } : order))
  }))
