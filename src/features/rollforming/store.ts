import { createStore } from '@/store/create-store'

import { fmtDate } from './format'
import { buildLineItem } from './line-item'
import seed from './seed.json'
import { showToast } from './ui'

import { arrivalKey, forgetOccupant, releaseStamps, shippedKey } from '@/store/shared/locations'
import { patchPackage } from '@/store/shared/shipping'

import {
  groupOf,
  isFullyWrapped,
  locName,
  pkgWeightOf,
  queueGroups,
  queueGroupsSorted,
  stockGateOk,
  supplierName
} from './selectors'

import type { CoilUnit, Location, Note, Order, RollformingState } from './types'
import type { NoteCtx } from './components/note-modal'

/** The prototype pins its own clock; every date in the seed is relative to this one. */
export const TODAY = '2026-07-15'

/** Rollforming is department 02; the code shows in the header chip and prefixes every barcode. */
export const DEPARTMENT = 'Rollforming'

/** Production date capacity, in linear feet. */
export const CAP_PER_DAY = 6000

/**
 * Soft package weight limit, in pounds.
 *
 * Local rather than the shared `wl_pkgmax_v1` Settings value that Trim and Accessories read: the
 * prototype's Rollforming page hardcodes its own, and a steel panel bundle is nothing like a box of
 * trim, so the number a Manager sets for Trim must not govern this screen.
 */
export const MAX_PKG_WEIGHT = 1400

/**
 * `seed.json` is the prototype's own `store.get()`, dumped rather than retyped — see
 * `tools/port/dump-seed.ts`. A quarter of the review comments anchor to ids built out of it.
 */
export const rollformingStore = createStore<RollformingState>(seed as unknown as RollformingState)

export const setSearch = (searchTerm: string) => rollformingStore.set({ searchTerm })

export const setActiveGroup = (activeGroup: string) => rollformingStore.set({ activeGroup })

/**
 * Switching between the three worker stations, which is not the same thing as the cross-page
 * "Viewing as" — moving to the Slit Line must not tell the other departments the role changed.
 *
 * Each station lands where it works: the Slit Line Worker on his own group, the Wrapping Worker on
 * everything, since he wraps whatever comes off any machine.
 */
export const setActor = (role: string) =>
  rollformingStore.set(
    role === 'slw'
      ? { role, activeGroup: 'Slit Line' }
      : role === 'ww'
        ? { role, activeGroup: 'All' }
        : { role }
  )

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

export const setPriority = (orderId: number, priorityId: number | null) => {
  const order = rollformingStore.get().orders.find(candidate => candidate.id === orderId)
  if (!order || order.priorityId === priorityId) return

  rollformingStore.set(state => ({
    orders: state.orders.map(candidate =>
      candidate.id === orderId ? { ...candidate, priorityId } : candidate
    )
  }))

  // #184: priority stays settable after release, and the Queue is derived — it regroups on its own
  if (order.released) showToast('Priority updated · Queue regrouped')
}

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

/* -- scheduling ----------------------------------------------------------------------------------- */

export const scheduleEntire = (orderIds: number[], iso: string) => {
  rollformingStore.set(state => ({
    orders: state.orders.map(order =>
      orderIds.includes(order.id) ? { ...order, productionDate: iso, isSplit: false } : order
    ),
    selectedOrderIds: []
  }))
  showToast(`Scheduled to ${fmtDate(iso)}`)
}

/**
 * Part of an order onto a day of its own. The order stays split until every line has a date, and only
 * then does it get a single production date again — a split order is one that sits on two days.
 */
export const scheduleSplit = (orderId: number, lineIds: number[], iso: string) => {
  rollformingStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== orderId) return order

      const lineItems = order.lineItems.map(item =>
        lineIds.includes(item.id) ? { ...item, scheduledDate: iso } : item
      )
      const allScheduled = lineItems.every(item => item.scheduledDate)

      return {
        ...order,
        lineItems,
        isSplit: !allScheduled,
        productionDate: allScheduled ? iso : order.productionDate || iso
      }
    }),
    selectedLineIds: [],
    splitOrderId: null
  }))
  showToast(`Split scheduled to ${fmtDate(iso)}`)
}

/**
 * Moving or dropping a production date returns the order to the state it arrived in.
 *
 * A rescheduled order is a new job on the floor: the priority, the review, the split and every
 * per-unit coil assignment were decided for the day it was going to run, so they do not survive the
 * move. Qty From Stock is left alone — it is a fact about the order, not about the day.
 */
const resetOrderEdits = (order: Order, productionDate: string | null): Order => ({
  ...order,
  productionDate,
  isSplit: false,
  reviewed: false,
  priorityId: null,
  lineItems: order.lineItems.map(item => ({
    ...item,
    scheduledDate: null,
    coils: item.coils.map(coil => ({
      ...coil,
      supplierId: null,
      coilNumber: '',
      slitDone: false,
      workerAssigned: false
    }))
  }))
})

export const rescheduleOrder = (orderId: number, iso: string) => {
  rollformingStore.set(state => ({
    orders: state.orders.map(order => (order.id === orderId ? resetOrderEdits(order, iso) : order))
  }))
  showToast(`Rescheduled to ${fmtDate(iso)}`)
}

export const unscheduleOrder = (orderId: number) => {
  const order = rollformingStore.get().orders.find(candidate => candidate.id === orderId)
  if (!order || order.released) return

  rollformingStore.set(state => ({
    orders: state.orders.map(candidate =>
      candidate.id === orderId ? resetOrderEdits(candidate, null) : candidate
    )
  }))
  showToast(`Order ${order.order} unscheduled`)
}

/* -- review and release --------------------------------------------------------------------------- */

export const setReviewed = (orderId: number, reviewed: boolean) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order =>
      order.id !== orderId
        ? order
        : {
            ...order,
            reviewed,
            exportSel: reviewed ? order.exportSel : false,
            releaseSel: reviewed ? order.releaseSel : false
          }
    )
  }))

/**
 * Both gates at once: Release puts the order on the floor, Export sends it to EBMS. An order picked
 * for Export is released too — that is why the two columns move together.
 */
export const releaseSelectedOrders = () => {
  const targets = rollformingStore.get().orders.filter(order => order.releaseSel)
  if (!targets.length) return

  const exported = targets.filter(order => order.exportSel).length

  rollformingStore.set(state => ({
    orders: state.orders.map(order =>
      order.releaseSel
        ? {
            ...order,
            released: true,
            exported: !!order.exportSel,
            exportSel: false,
            releaseSel: false
          }
        : order
    )
  }))

  showToast(
    `Released ${targets.length} order${targets.length > 1 ? 's' : ''} to production${
      exported ? ` · ${exported} exported` : ''
    }`
  )
}

/* -- material requests --------------------------------------------------------------------------- */

let requestSeq = 411

/**
 * Order origin #2: raw coil a Rollforming machine is asking for.
 *
 * It carries no customer, no ship date and no salesman, because nobody bought it — the machine needs
 * material. That is also why it never splits: there is one line and one coil behind it.
 */
export const createMaterialRequest = (form: {
  profile: string
  gauge: string
  thickness: string
  color: string
  width: string
  linearFeet: string
  priorityId: number | null
  supplierId: number | null
}) => {
  requestSeq += 1
  const number = `MR-704${requestSeq % 100}`

  const order: Order = {
    id: Date.now(),
    order: number,
    originType: 'material_request',
    requestedBy: 'Material Request from Rollformer',
    customer: '—',
    entryDate: TODAY,
    shipDate: null,
    priorityId: form.priorityId,
    reviewed: false,
    released: false,
    exported: false,
    productionDate: null,
    isSplit: false,
    notes: [],
    lineItems: [
      buildLineItem({
        profile: form.profile,
        gauge: Number.parseFloat(form.gauge) || 26,
        thickness: Number.parseFloat(form.thickness) || 0.018,
        width: Number.parseFloat(form.width) || 40,
        color: form.color,
        qty: 1,
        length: null,
        linearFeet: Number.parseInt(form.linearFeet, 10) || 1000,
        coilPreset: [{ supplierId: form.supplierId, coilNumber: '' }]
      })
    ],
    packages: [],
    address: '',
    city: '',
    po: '',
    salesman: '',
    shipVia: ''
  }

  rollformingStore.set(state => ({ orders: [order, ...state.orders] }))
  return number
}

/* -- stock ---------------------------------------------------------------------------------------- */

/**
 * How many of a line's pieces come off the shelf. The count is kept, but what it means is which units
 * carry `stock` — the tail ones, matching the canvas — so the two never disagree. A unit that becomes
 * stock loses any slit request with it: it is not being rolled at all.
 */
export const setLineFromStock = (orderId: number, lineId: number, fromStock: number) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order =>
      order.id !== orderId
        ? order
        : {
            ...order,
            lineItems: order.lineItems.map(item => {
              if (item.id !== lineId) return item

              const count = Math.max(0, Math.min(item.qty, fromStock))
              const firstStockIdx = item.qty - count

              return {
                ...item,
                fromStock: count,
                coils: Array.from({ length: item.qty }, (_, index): CoilUnit => {
                  const current =
                    item.coils[index] ??
                    ({
                      supplierId: null,
                      coilNumber: '',
                      needsSlit: false,
                      slitDone: false,
                      workerAssigned: false,
                      stock: false
                    } as CoilUnit)

                  return index >= firstStockIdx
                    ? { ...current, stock: true, needsSlit: false, slitDone: false }
                    : { ...current, stock: false }
                })
              }
            })
          }
    )
  }))

/** Returns whether the unit was turned on, so the caller can ask *which* stock coil is being used. */
export const toggleUnitStock = (orderId: number, lineId: number, coilIdx: number) => {
  if (!stockGateOk(orderId)) return false
  let turnedOn = false

  rollformingStore.set(state => ({
    orders: state.orders.map(order =>
      order.id !== orderId
        ? order
        : {
            ...order,
            lineItems: order.lineItems.map(item => {
              if (item.id !== lineId) return item

              const coils = item.coils.map((coil, index) => {
                if (index !== coilIdx) return coil
                if (coil.stock) return { ...coil, stock: false }
                turnedOn = true
                return { ...coil, stock: true, needsSlit: false, slitDone: false }
              })

              return { ...item, coils, fromStock: coils.filter(coil => coil.stock).length }
            })
          }
    )
  }))

  return turnedOn
}

/* -- packages ------------------------------------------------------------------------------------- */

/**
 * One package per line that had a quantity typed. Sequence numbers never reuse and never reset: the
 * barcode is printed on a label that may already be on a truck.
 */
export const createPackages = (orderId: number, lines: [number, number][]) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== orderId) return order

      let seq = (order.packages || []).reduce((highest, pkg) => Math.max(highest, pkg.seq), 0)
      const created = lines.map(([lineId, qty]) => {
        seq += 1
        return {
          seq,
          barcode: `02-${order.order}-${String(seq).padStart(2, '0')}`,
          lineId,
          qty,
          locId: null,
          customer: order.customer,
          order: order.order,
          po: `PO-${5000 + order.id}`
        }
      })

      return { ...order, packages: [...(order.packages || []), ...created] }
    })
  }))

/**
 * Deleting a package puts its pieces back into Left To Package and invalidates the barcode.
 *
 * The package row itself is kept and flagged: the label exists in the world, so a later scan in
 * Shipping has to be able to say it was deleted rather than that it was never printed. The weight it
 * was holding is released from its location's occupant slot, and the slot itself goes if nothing else
 * of this order is still there.
 */
export const deletePackage = (orderId: number, seq: number) => {
  const order = rollformingStore.get().orders.find(candidate => candidate.id === orderId)
  const pkg = order?.packages.find(candidate => candidate.seq === seq)
  if (!order || !pkg || pkg.deleted) return

  const released = pkgWeightOf(order, pkg)

  rollformingStore.set(state => ({
    orders: state.orders.map(candidate =>
      candidate.id !== orderId
        ? candidate
        : {
            ...candidate,
            packages: candidate.packages.map(entry =>
              entry.seq === seq ? { ...entry, deleted: true, locId: null } : entry
            )
          }
    ),
    locations: pkg.locId
      ? state.locations.map(location => {
          if (location.id !== pkg.locId) return location

          const stillThere = order.packages.some(
            entry => entry.seq !== seq && entry.locId === pkg.locId && !entry.deleted
          )
          const occupants = stillThere
            ? (location.occupants ?? []).map(occupant =>
                occupant.orderId === orderId
                  ? { ...occupant, weight: Math.max(0, occupant.weight - released) }
                  : occupant
              )
            : (location.occupants ?? []).filter(occupant => occupant.orderId !== orderId)

          return { ...location, occupants }
        })
      : state.locations
  }))

  patchPackage(pkg.barcode, { deleted: true })
  showToast('Package deleted · barcode invalidated · status reverted')
}

/* -- locations ------------------------------------------------------------------------------------ */

/** Rollforming's own release-stamp scope: every department numbers its locations from 1. */
const LOC_SCOPE = 'rf' as const

/** Occupant weight in a cell after a package joins or leaves it. */
const withoutOccupant = (location: Location, orderId: number, weight: number, keep: boolean) => ({
  ...location,
  occupants: keep
    ? (location.occupants ?? []).map(occupant =>
        occupant.orderId === orderId
          ? { ...occupant, weight: Math.max(0, occupant.weight - weight) }
          : occupant
      )
    : (location.occupants ?? []).filter(occupant => occupant.orderId !== orderId)
})

/**
 * A package gets a Location — which is also how an order finishes.
 *
 * Weight follows the package: it leaves the cell it came from and joins the one it lands in, and the
 * old occupant slot goes if no other package of this order is still there. The arrival stamp is what
 * the 15-minute auto-release counts from, so it is written fresh here.
 *
 * Once every piece has a location the order is complete, stamped at this moment rather than watched
 * for — this is when it became true.
 */
export const assignPackageToLocation = (orderId: number, seq: number, locationId: number) => {
  const order = rollformingStore.get().orders.find(candidate => candidate.id === orderId)
  const pkg = order?.packages.find(candidate => candidate.seq === seq)
  if (!order || !pkg) return

  const weight = pkgWeightOf(order, pkg)
  const previous = pkg.locId
  const scannedAt = Date.now()

  rollformingStore.set(state => ({
    orders: state.orders.map(candidate =>
      candidate.id !== orderId
        ? candidate
        : {
            ...candidate,
            packages: candidate.packages.map(entry =>
              entry.seq === seq ? { ...entry, locId: locationId } : entry
            )
          }
    ),
    locations: state.locations.map(location => {
      if (location.id === previous && previous !== locationId)
        return withoutOccupant(
          location,
          orderId,
          weight,
          order.packages.some(
            entry => entry.seq !== seq && entry.locId === previous && !entry.deleted
          )
        )

      if (location.id === locationId) {
        const occupants = location.occupants ?? []
        return {
          ...location,
          occupants: occupants.some(occupant => occupant.orderId === orderId)
            ? occupants.map(occupant =>
                occupant.orderId === orderId
                  ? { ...occupant, weight: occupant.weight + weight, lastScanAt: scannedAt }
                  : occupant
              )
            : [...occupants, { orderId, weight, lastScanAt: scannedAt }]
        }
      }

      return location
    })
  }))

  const stamps = releaseStamps(LOC_SCOPE)
  const next = { ...stamps.get() }
  delete next[shippedKey(locationId, orderId)]
  next[arrivalKey(locationId, orderId)] = scannedAt
  stamps.set(next)

  if (previous && previous !== locationId) {
    const old = rollformingStore.get().locations.find(location => location.id === previous)
    if (!(old?.occupants ?? []).some(occupant => occupant.orderId === orderId))
      forgetOccupant(LOC_SCOPE, previous, orderId)
  }

  const updated = rollformingStore.get().orders.find(candidate => candidate.id === orderId)
  const code = locName(locationId)

  if (updated && isFullyWrapped(updated) && !updated.completedAt) {
    rollformingStore.set(state => ({
      orders: state.orders.map(candidate =>
        candidate.id === orderId
          ? { ...candidate, completedAt: new Date().toISOString() }
          : candidate
      )
    }))
    return showToast(`Package ${pkg.barcode} → ${code} · order complete`)
  }

  showToast(`Package ${pkg.barcode} → ${code}`)
}

export const removePackageLocation = (orderId: number, seq: number, locationId: number) => {
  const order = rollformingStore.get().orders.find(candidate => candidate.id === orderId)
  const pkg = order?.packages.find(candidate => candidate.seq === seq)
  if (!order || !pkg) return

  const weight = pkgWeightOf(order, pkg)

  rollformingStore.set(state => ({
    orders: state.orders.map(candidate =>
      candidate.id !== orderId
        ? candidate
        : {
            ...candidate,
            packages: candidate.packages.map(entry =>
              entry.seq === seq ? { ...entry, locId: null } : entry
            )
          }
    ),
    locations: state.locations.map(location =>
      location.id !== locationId
        ? location
        : withoutOccupant(
            location,
            orderId,
            weight,
            order.packages.some(
              entry => entry.seq !== seq && entry.locId === locationId && !entry.deleted
            )
          )
    )
  }))

  const still = rollformingStore.get().locations.find(location => location.id === locationId)
  if (!(still?.occupants ?? []).some(occupant => occupant.orderId === orderId))
    forgetOccupant(LOC_SCOPE, locationId, orderId)

  showToast(`Location ${locName(locationId)} removed`)
}

/* -- coil assignment ----------------------------------------------------------------------------- */

/** One Supplier and one Coil Number across every unit picked, and the selection is spent. */
export const assignUnits = (
  orderId: number,
  units: { lineId: number; coilIdx: number }[],
  supplierId: number | null,
  coilNumber: string
) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order =>
      order.id !== orderId
        ? order
        : {
            ...order,
            lineItems: order.lineItems.map(item => {
              const indexes = units
                .filter(unit => unit.lineId === item.id)
                .map(unit => unit.coilIdx)
              if (!indexes.length) return item

              return {
                ...item,
                coils: item.coils.map((coil, index) =>
                  indexes.includes(index) ? { ...coil, supplierId, coilNumber } : coil
                )
              }
            })
          }
    ),
    selectedCoilCtx: null
  }))

/**
 * A unit either rolls off a coil that exists or waits for one to be slit, and the two are exclusive:
 * sending it to the Slit Line drops whatever coil it had been given, because that coil is not the one
 * it will roll off. Stock units have no slit decision — they are not being rolled.
 */
export const toggleNeedsSlit = (orderId: number, lineId: number, coilIdx: number) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order =>
      order.id !== orderId
        ? order
        : {
            ...order,
            lineItems: order.lineItems.map(item =>
              item.id !== lineId
                ? item
                : {
                    ...item,
                    coils: item.coils.map((coil, index) => {
                      if (index !== coilIdx || coil.stock) return coil
                      const needsSlit = !coil.needsSlit
                      return {
                        ...coil,
                        needsSlit,
                        slitDone: false,
                        supplierId: needsSlit ? null : coil.supplierId,
                        coilNumber: needsSlit ? '' : coil.coilNumber
                      }
                    })
                  }
            )
          }
    )
  }))

/** Remembered rather than only written to the clipboard: the paste button is the reliable path. */
export const copyCoilNumber = (coilNumber: string) => {
  if (!coilNumber) return
  void navigator.clipboard?.writeText(coilNumber).catch(() => {})
  rollformingStore.set({ copiedCoilNumber: coilNumber })
  showToast(`Copied Coil Number ${coilNumber}`)
}

/* -- the queue ----------------------------------------------------------------------------------- */

/**
 * The Queue is derived, so there is no row to write to: a change is applied to every coil unit whose
 * recomputed key matches the row's. Stock units never form a row, so a key they happen to share must
 * not carry an edit onto them.
 */
const patchQueueGroup = (groupKey: string, patch: (coil: CoilUnit) => CoilUnit) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order => ({
      ...order,
      lineItems: order.lineItems.map(item => ({
        ...item,
        coils: item.coils.map(coil => {
          if (coil.stock) return coil
          const key = [
            order.productionDate || '',
            item.color,
            item.gauge,
            item.profile,
            order.priorityId || 0,
            coil.supplierId || 0,
            coil.coilNumber || '',
            coil.needsSlit ? 1 : 0
          ].join('|')
          return key === groupKey ? patch(coil) : coil
        })
      }))
    }))
  }))

export const setQueueSupplier = (groupKey: string, supplierId: number | null) => {
  patchQueueGroup(groupKey, coil => ({
    ...coil,
    supplierId,
    coilNumber: '',
    workerAssigned: true
  }))
  showToast(
    `Supplier set to ${supplierId ? supplierName(supplierId, rollformingStore.get().suppliers) : 'Undefined'}`
  )
}

export const setQueueCoilNumber = (groupKey: string, coilNumber: string) => {
  patchQueueGroup(groupKey, coil => ({ ...coil, coilNumber, workerAssigned: true }))
  showToast(`Coil Number ${coilNumber} assigned`)
}

export const setQueueLotNumber = (groupKey: string, lot: string) => {
  patchQueueGroup(groupKey, coil => ({ ...coil, coilNumber: lot, lotNumber: lot }))
  showToast(`Lot Number ${lot} filled into the Coil Number field`)
}

let slitSeq = 800

/**
 * The Slit Line Worker reporting a row done. The material now exists, so the Supplier and Coil Number
 * that were locked can finally be answered — and are, automatically: the slitter is what produced this
 * coil, so the shop's own supplier and the next slit number are the only right answers.
 */
export const completeSlitLine = (groupKey: string) => {
  const [date, color, gauge, profile, priorityId] = groupKey.split('|')
  slitSeq += 1
  const filled = { supplierId: 3, coilNumber: `CN-${slitSeq}` }

  rollformingStore.set(state => ({
    orders: state.orders.map(order => ({
      ...order,
      lineItems: order.lineItems.map(item => {
        if (item.color !== color || String(item.gauge) !== gauge || item.profile !== profile)
          return item
        if (String(order.productionDate) !== date || String(order.priorityId || 0) !== priorityId)
          return item

        return {
          ...item,
          coils: item.coils.map(coil =>
            coil.needsSlit && !coil.slitDone ? { ...coil, slitDone: true, ...filled } : coil
          )
        }
      })
    }))
  }))

  showToast('Slit Line complete — Supplier & Coil Number auto-filled')
}

/**
 * One coil per machine is in the rollformer, and checking it in draws its footage off On Hand.
 *
 * Unchecking puts the footage back: the coil never ran, so the stock reading was wrong rather than
 * spent. The same tick therefore both records what is loaded and keeps EBMS's quantity honest.
 */
export const toggleCoilInMachine = (groupKey: string) => {
  const row = queueGroups().find(candidate => candidate.key === groupKey)
  if (!row) return

  const group = groupOf(row.profile)
  let depleted = false

  rollformingStore.set(state => {
    const already = state.currentCoilByGroup[group]?.key === groupKey
    const next = { ...state.currentCoilByGroup }

    if (already) delete next[group]
    else
      next[group] = {
        key: groupKey,
        supplierId: row.supplierId,
        coilNumber: row.coilNumber,
        material: `${row.gauge}ga ${row.color}`
      }

    const coils = state.coils.map(coil => {
      if (!row.coilNumber || coil.coilNumber !== row.coilNumber) return coil
      depleted = !already
      return { ...coil, onHand: Math.max(0, coil.onHand + (already ? row.lf : -row.lf)) }
    })

    return { currentCoilByGroup: next, coils }
  })

  const loaded = !!rollformingStore.get().currentCoilByGroup[group]
  showToast(
    `Coil ${loaded ? 'checked into ' : 'removed from '}${group}${
      depleted ? ` · On Hand −${row.lf.toLocaleString()} ln ft` : ''
    }`
  )
}

/** A row's place in its day, which the Manager sets by hand — never across days. */
export const reorderQueue = (date: string, fromKey: string, toKey: string, group: string) => {
  if (fromKey === toKey) return

  rollformingStore.set(state => {
    const rows = queueGroupsSorted(group, state).find(bucket => bucket.date === date)?.rows ?? []
    const keys = rows.map(row => row.key)
    const from = keys.indexOf(fromKey)
    if (from === -1) return {}

    keys.splice(from, 1)
    // the target's index has to be read after the removal, or the row lands one place late
    const to = keys.indexOf(toKey)
    if (to === -1) return {}

    keys.splice(to, 0, fromKey)
    return { queueOrder: { ...state.queueOrder, [date]: keys } }
  })
}

/* -- notes ------------------------------------------------------------------------------------- */

const patchNotes = (ctx: NoteCtx, fn: (notes: Note[]) => Note[]) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== ctx.orderId) return order
      if (ctx.lineId == null) return { ...order, notes: fn(order.notes) }

      return {
        ...order,
        lineItems: order.lineItems.map(item =>
          item.id === ctx.lineId ? { ...item, notes: fn(item.notes ?? []) } : item
        )
      }
    })
  }))

export const addNote = (ctx: NoteCtx, note: Note) => patchNotes(ctx, notes => [...notes, note])

export const acknowledgeNote = (ctx: NoteCtx, noteId: number) =>
  patchNotes(ctx, notes =>
    notes.map(note => (note.id === noteId ? { ...note, dealt: true } : note))
  )

export const setScheduledDay = (scheduledDay: string) => rollformingStore.set({ scheduledDay })

export const setCoilsFolder = (expandedCoilsFolder: string) =>
  rollformingStore.set({ expandedCoilsFolder })
