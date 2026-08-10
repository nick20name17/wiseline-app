import { createStore } from '@/store/create-store'

import seed from './seed.json'

import type { AccessoriesState, Note } from './types'

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

/** Scheduling the whole order clears any split: every line moves to the one day. */
export const scheduleEntire = (orderIds: number[], prepDate: string) =>
  accessoriesStore.set(state => ({
    orders: state.orders.map(order =>
      orderIds.includes(order.id)
        ? {
            ...order,
            prepDate,
            isSplit: false,
            items: order.items.map(item => ({ ...item, scheduledDate: prepDate }))
          }
        : order
    ),
    selectedOrderIds: []
  }))

/**
 * Only the ticked lines get the date. The order stays split until every line has one — and it keeps its
 * existing Prep Date if it had one, because the half already scheduled is still being prepped that day.
 */
export const scheduleSplit = (orderId: number, lineIds: number[], prepDate: string) =>
  accessoriesStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== orderId) return order

      const items = order.items.map(item =>
        lineIds.includes(item.id) ? { ...item, scheduledDate: prepDate } : item
      )
      const allScheduled = items.every(item => item.scheduledDate)

      return {
        ...order,
        items,
        isSplit: !allScheduled,
        prepDate: allScheduled ? prepDate : (order.prepDate ?? prepDate)
      }
    }),
    selectedLineIds: [],
    splitOrderId: null
  }))

/** A reschedule or an unschedule resets a partial split — the whole order moves together. */
export const rescheduleOrder = (orderId: number, prepDate: string) =>
  accessoriesStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? {
            ...order,
            prepDate,
            isSplit: false,
            items: order.items.map(item => ({ ...item, scheduledDate: prepDate }))
          }
        : order
    )
  }))

export const unscheduleOrder = (orderId: number) =>
  accessoriesStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? {
            ...order,
            prepDate: null,
            isSplit: false,
            items: order.items.map(item => ({ ...item, scheduledDate: null }))
          }
        : order
    )
  }))

const patchNotes = (
  ctx: { orderId: number; lineId: number | null },
  patch: (notes: Note[]) => Note[]
) =>
  accessoriesStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== ctx.orderId) return order
      if (ctx.lineId != null)
        return {
          ...order,
          items: order.items.map(item =>
            item.id === ctx.lineId ? { ...item, notes: patch(item.notes) } : item
          )
        }
      return { ...order, orderNotes: patch(order.orderNotes) }
    })
  }))

export const acknowledgeNote = (ctx: { orderId: number; lineId: number | null }, noteId: number) =>
  patchNotes(ctx, notes =>
    notes.map(note => (note.id === noteId ? { ...note, dealt: true } : note))
  )

/** Only line items take replies — an order's notes are EBMS's, and this app does not write there. */
export const addLineNote = (orderId: number, lineId: number, body: string, author: string) =>
  patchNotes({ orderId, lineId }, notes => [
    ...notes,
    {
      id: Date.now(),
      author,
      email: 'you@wiseline.app',
      ts: 'just now',
      body,
      dealt: false,
      source: 'app'
    }
  ])
