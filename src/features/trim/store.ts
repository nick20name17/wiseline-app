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
  // not in the dump: the prototype keeps its open cards outside the store
  expandedBatches: [],
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

/** Changing the day drops the release selection: it was made against the day that is going away. */
export const setScheduledDay = (scheduledDay: string) =>
  trimStore.set({ scheduledDay, releaseIds: [] })

/** Gate 3 (N-026): an order can only be picked for release once it has been Reviewed. */
export const toggleRelease = (orderId: number) =>
  trimStore.set(state => {
    const order = state.orders.find(candidate => candidate.id === orderId)
    if (!order || order.released || !order.reviewed) return {}

    return {
      releaseIds: state.releaseIds.includes(orderId)
        ? state.releaseIds.filter(id => id !== orderId)
        : [...state.releaseIds, orderId]
    }
  })

/** Picking lines for a split belongs to one order at a time; the last empty selection releases it. */
export const toggleLineSelect = (orderId: number, lineId: number) =>
  trimStore.set(state => {
    const ids = state.splitOrderId === orderId ? state.selectedLineIds : []
    const next = ids.includes(lineId) ? ids.filter(id => id !== lineId) : [...ids, lineId]
    return { splitOrderId: next.length ? orderId : null, selectedLineIds: next }
  })

export const setProdMode = (prodMode: string) => trimStore.set({ prodMode })

export const setProdListMode = (prodListMode: string) => trimStore.set({ prodListMode })

export const setActiveMachine = (activeMachine: number) => trimStore.set({ activeMachine })

export const toggleBatchExpand = (key: string) =>
  trimStore.set(state => ({
    expandedBatches: state.expandedBatches.includes(key)
      ? state.expandedBatches.filter(open => open !== key)
      : [...state.expandedBatches, key]
  }))

/* -- scheduling (N-006/007, N-041/042, N-160) -------------------------------------------------- */

/**
 * Rescheduling or unscheduling resets what the Manager had already decided.
 *
 * Verbatim from the canvas: an order that moves day loses its Priority, its Reviewed tick, its machine
 * assignments and its # From Stock. The reasoning is that those were judgements about a particular
 * day's run, and the day is what changed.
 */
const resetManagerEdits = <T extends object>(item: T, extra: Partial<T>) => ({
  ...item,
  machineId: null,
  fromStock: 0,
  status: null,
  ...extra
})

/** An order is split while its lines sit on different days, and dated by the earliest of them. */
const redate = (lineItems: TrimState['orders'][number]['lineItems']) => {
  const dates = lineItems.map(item => item.scheduledDate)
  const sameDay = new Set(dates).size === 1
  return {
    lineItems,
    isSplit: !sameDay,
    productionDate: sameDay ? dates[0]! : dates.filter(Boolean).sort()[0]!
  }
}

/** N-160: the order-level tick schedules only the trim still unscheduled; split lines keep their day. */
export const scheduleOrders = (orderIds: number[], iso: string) =>
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      orderIds.includes(order.id)
        ? {
            ...order,
            ...redate(
              order.lineItems.map(item =>
                item.scheduledDate ? item : { ...item, scheduledDate: iso }
              )
            )
          }
        : order
    ),
    selectedOrderIds: []
  }))

/** N-006/007: the order stays in Unscheduled until every line has a day. */
export const scheduleLines = (orderId: number, lineIds: number[], iso: string) =>
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? {
            ...order,
            ...redate(
              order.lineItems.map(item =>
                lineIds.includes(item.id) ? { ...item, scheduledDate: iso } : item
              )
            )
          }
        : order
    ),
    selectedLineIds: [],
    splitOrderId: null
  }))

export const rescheduleOrder = (orderId: number, iso: string) =>
  trimStore.set(state => ({
    scheduledDay: iso,
    orders: state.orders.map(order =>
      order.id === orderId
        ? {
            ...order,
            productionDate: iso,
            priorityId: null,
            reviewed: false,
            isSplit: false,
            lineItems: order.lineItems.map(item =>
              resetManagerEdits(item, { scheduledDate: iso })
            )
          }
        : order
    )
  }))

export const unscheduleOrder = (orderId: number) =>
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? {
            ...order,
            productionDate: null,
            isSplit: false,
            reviewed: false,
            priorityId: null,
            lineItems: order.lineItems.map(item =>
              resetManagerEdits(item, { scheduledDate: null })
            )
          }
        : order
    )
  }))

/** Straight to Wrapping: no Slinet, no machines, and today's date, because it is being done now. */
export const bypassProduction = (orderIds: number[]) =>
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      orderIds.includes(order.id)
        ? {
            ...order,
            bypassed: true,
            released: true,
            productionDate: TODAY,
            isSplit: false,
            lineItems: order.lineItems.map(item => ({
              ...item,
              scheduledDate: TODAY,
              status: 'bypassed'
            }))
          }
        : order
    ),
    releaseIds: [],
    selectedOrderIds: []
  }))

export const setPeekDay = (peekDay: string | null) => trimStore.set({ peekDay })
