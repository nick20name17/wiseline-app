import { createStore } from '@/store/create-store'
import { arrivalKey, forgetOccupant, releaseStamps, shippedKey } from '@/store/shared/locations'
import { patchPackage } from '@/store/shared/shipping'

import seed from './seed.json'

import type { AccessoriesState, LineItem, Note, Package } from './types'

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

const patchItems = (orderId: number, patch: (item: LineItem) => LineItem) =>
  accessoriesStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId ? { ...order, items: order.items.map(patch) } : order
    )
  }))

/** A quantity is clamped to what is left: the input cannot promise more than the order has. */
export const setPackaging = (orderId: number, itemId: number, value: string) => {
  const parsed = parseInt(value, 10)
  const wanted = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed

  patchItems(orderId, item =>
    item.id === itemId
      ? { ...item, packaging: Math.min(Math.max(wanted, 0), item.leftToPackage) }
      : item
  )
}

export const autoFillLine = (orderId: number, itemId: number) =>
  patchItems(orderId, item =>
    item.id === itemId ? { ...item, packaging: item.leftToPackage } : item
  )

export const clearPackaging = (orderId: number, itemId: number) =>
  patchItems(orderId, item => (item.id === itemId ? { ...item, packaging: 0 } : item))

/** A blank or nonsense limit falls back to fifteen pounds rather than to no limit at all. */
export const setMaxPkgWeight = (orderId: number, value: string) => {
  const parsed = parseFloat(value)
  const maxPkgWeight = Number.isNaN(parsed) || parsed <= 0 ? 15 : parsed

  accessoriesStore.set(state => ({
    orders: state.orders.map(order => (order.id === orderId ? { ...order, maxPkgWeight } : order))
  }))
}

/** Accessories is department 03, and that is the first field of every barcode it prints. */
const DEPT_CODE = '03'

const stampArrival = (locationId: number, orderId: number, at: number) => {
  const stamps = releaseStamps('acc')
  const next = { ...stamps.get() }
  delete next[shippedKey(locationId, orderId)]
  next[arrivalKey(locationId, orderId)] = at
  stamps.set(next)
}

/**
 * The printed package: what was staged becomes real, and the pieces leave Left To Package.
 *
 * The weight accrues on this order's own occupant slot rather than on the location, because a
 * Multi-Order location holds several orders at once and each keeps its own weight and its own release
 * countdown.
 */
export const finalizePackage = (orderId: number, locationId: number | null, weight: number) => {
  const state = accessoriesStore.get()
  const order = state.orders.find(entry => entry.id === orderId)
  if (!order) return null

  const seq = (order.pkgSeq || 0) + 1
  const code = `${DEPT_CODE}-${order.orderNumber}-${String(seq).padStart(2, '0')}`
  const at = Date.now()

  const pkg: Package = {
    id: at + Math.random(),
    code,
    seq,
    weight,
    locationId,
    items: order.items
      .filter(item => item.packaging > 0)
      .map(item => ({ itemId: item.id, productId: item.productId, qty: item.packaging })),
    deleted: false
  }

  const location = locationId ? state.locations.find(entry => entry.id === locationId) : undefined
  const isNewOccupant =
    !!location && !location.occupants.some(occupant => occupant.orderId === orderId)

  accessoriesStore.set(current => ({
    orders: current.orders.map(entry =>
      entry.id !== orderId
        ? entry
        : {
            ...entry,
            pkgSeq: seq,
            packages: [...entry.packages, pkg],
            items: entry.items.map(item =>
              item.packaging > 0
                ? { ...item, leftToPackage: item.leftToPackage - item.packaging, packaging: 0 }
                : item
            )
          }
    ),
    locations: locationId
      ? current.locations.map(entry => {
          if (entry.id !== locationId) return entry

          const held = entry.occupants.some(occupant => occupant.orderId === orderId)
          return {
            ...entry,
            occupants: held
              ? entry.occupants.map(occupant =>
                  occupant.orderId === orderId
                    ? { ...occupant, weight: occupant.weight + weight }
                    : occupant
                )
              : [...entry.occupants, { orderId, weight, lastScanAt: at }]
          }
        })
      : current.locations
  }))

  // normally the location picker already made this slot; this only covers a slot created right here
  if (isNewOccupant && locationId) stampArrival(locationId, orderId, at)

  return pkg
}

/**
 * A soft delete. The barcode is tombstoned rather than dropped, because the label is already printed
 * and scanning it has to report a deleted package rather than an unknown one. The pieces go back to
 * Left To Package, and the location gives back the weight.
 */
export const deletePackage = (orderId: number, pkgId: number) => {
  const state = accessoriesStore.get()
  const order = state.orders.find(entry => entry.id === orderId)
  const pkg = order?.packages.find(entry => entry.id === pkgId)
  if (!order || !pkg || pkg.deleted) return null

  patchPackage(pkg.code, { deleted: true })

  accessoriesStore.set(current => ({
    orders: current.orders.map(entry =>
      entry.id !== orderId
        ? entry
        : {
            ...entry,
            packages: entry.packages.map(candidate =>
              candidate.id === pkgId ? { ...candidate, deleted: true } : candidate
            ),
            items: entry.items.map(item => {
              const line = pkg.items.find(candidate => candidate.itemId === item.id)
              return line
                ? {
                    ...item,
                    leftToPackage: Math.min(item.qtyOrdered, item.leftToPackage + line.qty)
                  }
                : item
            })
          }
    ),
    locations: pkg.locationId
      ? current.locations.map(entry =>
          entry.id !== pkg.locationId
            ? entry
            : {
                ...entry,
                occupants: entry.occupants.map(occupant =>
                  occupant.orderId === orderId
                    ? { ...occupant, weight: Math.max(0, occupant.weight - pkg.weight) }
                    : occupant
                )
              }
        )
      : current.locations
  }))

  return pkg
}

/**
 * A location taken for this order. The arrival stamp is written here rather than on the first package,
 * because the countdown is about the location being occupied, not about what is in it yet.
 */
export const assignLocation = (orderId: number, locationId: number) => {
  const at = Date.now()

  accessoriesStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? { ...order, locationIds: [...(order.locationIds ?? []), locationId] }
        : order
    ),
    locations: state.locations.map(location =>
      location.id === locationId
        ? {
            ...location,
            occupants: [...location.occupants, { orderId, weight: 0, lastScanAt: at }]
          }
        : location
    )
  }))

  stampArrival(locationId, orderId, at)
}

/** Only this order's slot is freed — a Multi-Order location keeps whatever else is standing in it. */
export const removeLocation = (orderId: number, locationId: number) => {
  accessoriesStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? { ...order, locationIds: (order.locationIds ?? []).filter(id => id !== locationId) }
        : order
    ),
    locations: state.locations.map(location =>
      location.id === locationId
        ? {
            ...location,
            occupants: location.occupants.filter(occupant => occupant.orderId !== orderId)
          }
        : location
    )
  }))

  forgetOccupant('acc', locationId, orderId)
}

/** Accessories has no production, so completing an order only moves it to Completed Orders. */
export const completeOrder = (orderId: number) =>
  accessoriesStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId ? { ...order, completed: true, completedDate: TODAY } : order
    )
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
