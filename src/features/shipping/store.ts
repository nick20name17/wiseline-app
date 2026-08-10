import { createStore } from '@/store/create-store'
import { patchLoadSequence, patchLoadStatus, patchOrderStatus } from '@/store/shared/shipping'

import { barcodeFor, loadById, loadKeyForLoad, orderById, schedGridOrders } from './selectors'
import seed from './seed.json'

import type { Load, LoadStatus, Order, ShippingState } from './types'

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

/** The per-truck grid's own search, which narrows only that grid. */
export const setSchSearch = (schSearch: string) => shippingStore.set({ schSearch })

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

const patchOrder = (orderId: number, patch: (order: Order) => Order) =>
  shippingStore.set(state => ({
    orders: state.orders.map(order => (order.id === orderId ? patch(order) : order))
  }))

/** Dealt-with is a toggle, not a one-way flag: a note can be reopened once it turns out it was not. */
export const toggleOrderNote = (orderId: number, noteId: number) =>
  patchOrder(orderId, order => ({
    ...order,
    notes: order.notes.map(note => (note.id === noteId ? { ...note, dealt: !note.dealt } : note))
  }))

/** A note the dispatcher writes here is already dealt with — they are the one dealing with it. */
export const addOrderNote = (orderId: number, body: string) =>
  patchOrder(orderId, order => ({
    ...order,
    notes: [
      ...order.notes,
      {
        id: order.notes.reduce((highest, note) => Math.max(highest, note.id), 0) + 1,
        author: 'Shipping Manager',
        email: 'dispatch@wiseline.ca',
        ts: 'Just now',
        body,
        dealt: true
      }
    ]
  }))

export const toggleSchedSel = (orderId: number) =>
  shippingStore.set(state => ({
    selScheduled: state.selScheduled.includes(orderId)
      ? state.selScheduled.filter(id => id !== orderId)
      : [...state.selScheduled, orderId]
  }))

export const toggleSchedRowExpand = (orderId: number) =>
  shippingStore.set(state => ({
    expScheduledRows: state.expScheduledRows.includes(orderId)
      ? state.expScheduledRows.filter(id => id !== orderId)
      : [...state.expScheduledRows, orderId]
  }))

/** Only orders not yet on a Load can be ticked, so Select All reaches only those. */
export const toggleSelectAllScheduled = (truckId: number, activeDay: string) => {
  const ids = schedGridOrders(truckId, activeDay)
    .filter(order => !order.loadId)
    .map(order => order.id)
  if (!ids.length) return

  shippingStore.set(state => {
    const allSelected = ids.every(id => state.selScheduled.includes(id))
    return {
      selScheduled: allSelected
        ? state.selScheduled.filter(id => !ids.includes(id))
        : [...new Set([...state.selScheduled, ...ids])]
    }
  })
}

/** `expTruck` is which truck's detail is focused; the prototype's inline-expand toggle for it is dead
 * code there, since the card became a modal, so it is not ported. */
export const setLoadFilter = (loadId: number, truckId: number) =>
  shippingStore.set(state => ({
    expTruck: truckId,
    loadFilter: state.loadFilter === loadId ? null : loadId,
    selScheduled: []
  }))

/**
 * A new Load out of what is ticked, and the delivery order it starts with.
 *
 * `sequence` starts as the order the rows were in; the Load modal is where it gets dragged into the
 * order the driver drives. The cross-page slice is told about it at once, because the driver screen
 * reads that sequence and not this store.
 */
export const addToLoad = (truckId: number, date: string) => {
  const state = shippingStore.get()
  const orderIds = state.selScheduled.filter(id => {
    const order = orderById(id, state.orders)
    return order && order.truckId === truckId && !order.loadId && order.shipDate === date
  })
  if (!orderIds.length) return 0

  const newId = state.nextLoadId

  shippingStore.set(current => {
    const same = current.loads.filter(load => load.truckId === truckId).length
    const newLoad: Load = {
      id: newId,
      truckId,
      date,
      status: 'unreleased',
      orderIds: [...orderIds],
      sequence: [...orderIds],
      deliveryTerm: 'Prepaid',
      loadUnloadTime: '—',
      vehicle: `Unit ${truckId}-${String.fromCharCode(65 + same)}`
    }

    return {
      loads: [...current.loads, newLoad],
      orders: current.orders.map(order =>
        orderIds.includes(order.id) ? { ...order, loadId: newId } : order
      ),
      selScheduled: current.selScheduled.filter(id => !orderIds.includes(id)),
      nextLoadId: current.nextLoadId + 1
    }
  })

  syncLoadSequence(newId)
  return orderIds.length
}

/**
 * A load's status is not set, it is *derived* from the orders on it — the real model computes it from
 * the `is_loaded` / `is_shipped` aggregates, and this mirrors that. An unreleased load is left alone:
 * it has not entered the cascade yet.
 */
export const recomputeLoad = (loadId: number) =>
  shippingStore.set(state => {
    const load = state.loads.find(entry => entry.id === loadId)
    if (!load || load.status === 'unreleased') return {}

    const orders = load.orderIds.map(id => state.orders.find(order => order.id === id))
    let status: LoadStatus
    let isLoaded = false
    let isShipped = false

    if (orders.every(order => order?.status === 'delivered')) {
      status = 'shipped'
      isLoaded = true
      isShipped = true
    } else if (
      orders.some(order => order?.status === 'shipping' || order?.status === 'delivered')
    ) {
      status = 'shipping'
      isLoaded = true
    } else if (orders.every(order => order?.status === 'loaded' || order?.status === 'delivered')) {
      status = 'loaded'
      isLoaded = true
    } else if (orders.every(order => order?.status === 'notstarted')) status = 'notstarted'
    else status = 'loading'

    return {
      loads: state.loads.map(entry =>
        entry.id === loadId
          ? { ...entry, status, is_loaded: isLoaded, is_shipped: isShipped }
          : entry
      )
    }
  })

export const recomputeLoadFor = (orderId: number) => {
  const order = orderById(orderId)
  if (order?.loadId) recomputeLoad(order.loadId)
}

/**
 * Extra packages on orders already on a truck's day, with their labels printed.
 *
 * A new package is not loaded yet, so an order that had been fully loaded drops back to `loading` —
 * but an order still blank (its load unreleased) stays blank: there is no cascade to fall back through.
 */
export const createNewPackages = (entries: { orderId: number; qty: number }[]) => {
  const wanted = entries.filter(entry => entry.qty > 0)
  if (!wanted.length) return []

  const barcodes: string[] = []

  shippingStore.set(state => ({
    orders: state.orders.map(order => {
      const entry = wanted.find(candidate => candidate.orderId === order.id)
      if (!entry) return order

      for (let index = 0; index < entry.qty; index++)
        barcodes.push(barcodeFor(order.order, order.packages.length + index + 1))

      const packages = [
        ...order.packages,
        ...Array.from({ length: entry.qty }, () => ({ loaded: false }))
      ]

      let status = order.status
      if (status !== '') {
        const loaded = packages.filter(pkg => pkg.loaded).length
        status = loaded === 0 ? 'notstarted' : loaded === packages.length ? 'loaded' : 'loading'
      }

      return { ...order, packages, status }
    })
  }))

  for (const entry of wanted) recomputeLoadFor(entry.orderId)
  return barcodes
}

const patchLoad = (loadId: number, fields: Partial<Load>) =>
  shippingStore.set(state => ({
    loads: state.loads.map(load => (load.id === loadId ? { ...load, ...fields } : load))
  }))

export const setLoadTerm = (loadId: number, deliveryTerm: string) =>
  patchLoad(loadId, { deliveryTerm })

export const setLoadVehicle = (loadId: number, vehicle: string) => patchLoad(loadId, { vehicle })

/** A stop dropped onto another takes that place, pushing the rest down — the prototype's splice order. */
export const moveStopTo = (loadId: number, from: number, to: number) => {
  const load = loadById(loadId)
  if (!load || from === to) return

  const sequence = [...load.sequence]
  const [moved] = sequence.splice(from, 1)
  if (moved === undefined) return
  sequence.splice(to, 0, moved)

  patchLoad(loadId, { sequence })
  syncLoadSequence(loadId)
}

/** The arrow buttons swap with the neighbour rather than splicing — one step, not a re-insert. */
export const moveStopBy = (loadId: number, index: number, direction: number) => {
  const load = loadById(loadId)
  if (!load) return

  const target = index + direction
  if (target < 0 || target >= load.sequence.length) return

  const sequence = [...load.sequence]
  const a = sequence[index] as number
  const b = sequence[target] as number
  sequence[index] = b
  sequence[target] = a

  patchLoad(loadId, { sequence })
  syncLoadSequence(loadId)
}

/**
 * Release To Loading hands the load to the warehouse at `Not Started`.
 *
 * It advances from there as packages are scanned onto the truck, which happens on the Loading station's
 * screen — so the statuses go into the cross-page slice too, or the scanner would not know the load
 * exists.
 */
export const releaseToLoading = (loadId: number) => {
  const load = loadById(loadId)
  if (!load || load.status !== 'unreleased') return false

  shippingStore.set(state => ({
    loads: state.loads.map(entry =>
      entry.id === loadId ? { ...entry, status: 'notstarted' as LoadStatus } : entry
    ),
    orders: state.orders.map(order =>
      load.orderIds.includes(order.id) ? { ...order, status: 'notstarted' as LoadStatus } : order
    )
  }))

  const key = loadKeyForLoad(load)
  if (key) patchLoadStatus(key, 'notstarted')
  for (const orderId of load.orderIds) {
    const order = orderById(orderId)
    if (order) patchOrderStatus(order.order, 'notstarted')
  }

  return true
}

/** The delivery order, published for the driver under the key the other screens know the load by. */
export const syncLoadSequence = (loadId: number) => {
  const state = shippingStore.get()
  const load = loadById(loadId, state.loads)
  if (!load) return

  const key = loadKeyForLoad(load, state.loads)
  if (!key) return

  patchLoadSequence(
    key,
    load.sequence
      .map(id => orderById(id, state.orders)?.order)
      .filter((orderNumber): orderNumber is string => !!orderNumber)
  )
}

/**
 * A ship date and a truck for every order the modal was opened with.
 *
 * Both selection lists are cleared, not only the one that opened it: the same modal serves the
 * Unscheduled flow and the Reschedule flow off the Scheduled grid, and either list may hold these ids.
 */
export const applySchedule = (orderIds: number[], truckId: number, shipDate: string) =>
  shippingStore.set(state => ({
    orders: state.orders.map(order =>
      orderIds.includes(order.id) ? { ...order, shipDate, truckId } : order
    ),
    selUnscheduled: state.selUnscheduled.filter(id => !orderIds.includes(id)),
    selScheduled: state.selScheduled.filter(id => !orderIds.includes(id))
  }))

export const setTruckNotes = (truckId: number, notes: string) =>
  shippingStore.set(state => ({
    trucks: state.trucks.map(truck => (truck.id === truckId ? { ...truck, notes } : truck))
  }))
