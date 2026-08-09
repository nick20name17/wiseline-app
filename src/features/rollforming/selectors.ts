import { rollformingStore, TODAY } from './store'

import type { CoilUnit, LineItem, Order, Priority } from './types'

/**
 * Everything derived, under the prototype's own names, so its knowledge base still describes this code.
 *
 * A selector that reads the store takes it as a trailing argument, defaulted to the live read. The
 * default is for callers outside render; a component must pass what it subscribed to. The React
 * Compiler keys a derived value on the reactive inputs it can *see*, and a call that reaches into the
 * store on its own shows it none — so the board would answer once and then freeze on stale rows.
 */

/**
 * Profile → machine tab, with the coverage and package cap the machine rolls at. Several profiles share
 * one tab: the paired machines each run two profiles.
 */
export const PROFILE_INFO: Record<
  string,
  { group: string; coverage: number; pkgCap: number | null }
> = {
  'Tuff Rib': { group: 'Tuff Rib & Diamond Rib', coverage: 36.0, pkgCap: 40 },
  'DRIPSTOP Tuff Rib': { group: 'Tuff Rib & Diamond Rib', coverage: 36.0, pkgCap: 40 },
  'Diamond Rib': { group: 'Tuff Rib & Diamond Rib', coverage: 36.0, pkgCap: 40 },
  'REVERSED Diamond Rib': { group: 'Tuff Rib & Diamond Rib', coverage: 36.0, pkgCap: 40 },
  'Agra Panel': { group: 'Agra Rib & Titan Rib', coverage: 36.0, pkgCap: 40 },
  'Titan Panel': { group: 'Agra Rib & Titan Rib', coverage: 36.0, pkgCap: 40 },
  'S.S. 1-1/2" Snaplock': { group: 'Standing Seam', coverage: 16.0, pkgCap: null },
  'S.S. 2" Mechanical': { group: 'Standing Seam', coverage: 16.0, pkgCap: null },
  'Board & Batten': { group: 'Board & Batten', coverage: 10.0, pkgCap: null },
  'Corrugated 7/8"': { group: 'Corrugated', coverage: 26.0, pkgCap: 30 }
}

/** The machine sub-tabs, in order, with Slit Line last — it is a process, not a rollformer. */
export const GROUPS = [
  'Tuff Rib & Diamond Rib',
  'Agra Rib & Titan Rib',
  'Standing Seam',
  'Board & Batten',
  'Corrugated',
  'Slit Line'
]

export const groupOf = (profile: string) => PROFILE_INFO[profile]?.group ?? (GROUPS[0] as string)

/** `Tuff Rib & Diamond Rib` → `TuffRibDiamondRib`, the slug every group-keyed `data-comment` uses. */
export const groupSlug = (group: string) => group.replace(/[^a-z0-9]+/gi, '')

export const priorityById = (
  id: number | null,
  priorities = rollformingStore.get().priorities
): Priority | null => priorities.find(priority => priority.id === id) ?? null

export const supplierName = (id: number | null, suppliers = rollformingStore.get().suppliers) =>
  suppliers.find(supplier => supplier.id === id)?.name ?? 'Undefined'

export const isOverdue = (iso: string | null) => !!iso && iso < TODAY

export const unscheduledOrders = (orders = rollformingStore.get().orders) =>
  orders.filter(order => !order.productionDate || order.isSplit)

export const scheduledOrders = (orders = rollformingStore.get().orders) =>
  orders.filter(order => order.productionDate)

/** The Scheduled tab drops an order once it is fully done — it moves to Completed, mirroring Trim. */
export const scheduledOrdersActive = (orders = rollformingStore.get().orders) =>
  scheduledOrders(orders).filter(order => !isDoneInProduction(order))

export const releasedOrders = (orders = rollformingStore.get().orders) =>
  orders.filter(order => order.released)

export const orderMatchesSearch = (
  order: Order,
  searchTerm = rollformingStore.get().searchTerm
) => {
  const query = searchTerm.trim().toLowerCase()
  if (!query) return true
  if (order.order.toLowerCase().includes(query)) return true
  if (order.customer.toLowerCase().includes(query)) return true
  return order.lineItems.some(
    item => item.profile.toLowerCase().includes(query) || item.color.toLowerCase().includes(query)
  )
}

/**
 * An order belongs to a machine tab if any line item maps there — or, on the Slit Line tab, if any of
 * its units is still waiting on the Slit Line Worker. Once slit, the material rolls under its own
 * profile's machine instead.
 */
export const orderInGroup = (order: Order, group: string) => {
  if (group === 'All') return true
  if (group === 'Slit Line')
    return order.lineItems.some(item =>
      rollCoils(item).some(coil => coil.needsSlit && !coil.slitDone)
    )
  return order.lineItems.some(item => groupOf(item.profile) === group)
}

/** Pass an explicit subset so each half of a split order only shows the gauge/colour still its own. */
export const gaugeColourLabel = (order: Order, items?: LineItem[]) =>
  [...new Set((items ?? order.lineItems).map(item => `${item.gauge}ga ${item.color}`))].join(
    ', '
  ) || '—'

/** The portion of a split order still sitting in Unscheduled. */
export const unscheduledLineItemsOf = (order: Order) =>
  order.isSplit ? order.lineItems.filter(item => !item.scheduledDate) : order.lineItems

/** The portion of a split order that landed on this order's current production date. */
export const scheduledLineItemsOf = (order: Order) =>
  order.isSplit
    ? order.lineItems.filter(item => item.scheduledDate === order.productionDate)
    : order.lineItems

export const noteState = (notes: { dealt: boolean }[] | undefined) => {
  if (!notes || notes.length === 0) return 'none'
  return notes.some(note => !note.dealt) ? 'unread' : 'read'
}

/** A Material Request is raw coil for a machine; it never splits and has no coil to assign. */
export const allCoilsAssignable = (order: Order) => order.originType !== 'material_request'

/** The units that still have to be rolled — everything except the ones ticked in the Stock column. */
export const rollCoils = (item: LineItem) => item.coils.filter(coil => !coil.stock)

export const packagesOf = (order: Order, lineId: number) =>
  (order.packages || []).filter(pkg => pkg.lineId === lineId && !pkg.deleted)

export const packagedQtyOf = (order: Order, lineId: number) =>
  packagesOf(order, lineId).reduce((total, pkg) => total + pkg.qty, 0)

export const wrappedQtyOf = (order: Order, lineId: number) =>
  packagesOf(order, lineId)
    .filter(pkg => pkg.locId != null)
    .reduce((total, pkg) => total + pkg.qty, 0)

export const leftToPackage = (order: Order, item: LineItem) =>
  item.qty - packagedQtyOf(order, item.id)

/** Packaging is blocked until every unit to roll has both a Supplier and a Coil Number. */
export const lineCoilReady = (item: LineItem) =>
  rollCoils(item).every(coil => !!coil.supplierId && !!coil.coilNumber)

export const statusOf = (order: Order, item: LineItem) => {
  if (!order.released) return ''
  if (wrappedQtyOf(order, item.id) >= item.qty) return 'wrapped'
  // a full-stock line is never In Progress or Rolled: none of it is being made
  if ((item.fromStock || 0) >= item.qty) return 'stock'
  const left = leftToPackage(order, item)
  if (left <= 0) return 'rolled'
  if (left < item.qty) return 'in_progress'
  return ''
}

export const isDoneInProduction = (order: Order) =>
  order.lineItems.every(item => leftToPackage(order, item) <= 0)

export const isFullyWrapped = (order: Order) =>
  order.lineItems.every(item => wrappedQtyOf(order, item.id) >= item.qty)

/** Not Started → In Progress → Complete, derived from the same per-line packaging math. */
export const orderStatusLabel = (order: Order) => {
  if (!order.released) return 'Not Started'
  if (isDoneInProduction(order)) return 'Complete'
  return order.lineItems.some(item =>
    ['in_progress', 'rolled', 'wrapped'].includes(statusOf(order, item))
  )
    ? 'In Progress'
    : 'Not Started'
}

/** Mock linear-feet and weight estimates, for display only. */
export const unitLF = (item: LineItem) =>
  item.linearFeet != null ? item.linearFeet : Math.round((item.length || 96) * 1.05)

export const unitWeight = (item: LineItem) =>
  Math.max(1, Math.round((item.width || 36) * 0.65 * ((item.length || 96) / 12)))

export const locById = (id: number | null, locations = rollformingStore.get().locations) =>
  locations.find(location => location.id === id) ?? null

export const locName = (id: number | null, locations = rollformingStore.get().locations) =>
  locById(id, locations)?.code ?? '—'

export const orderLocLabel = (order: Order, locations = rollformingStore.get().locations) => {
  const ids = [
    ...new Set(
      (order.packages || [])
        .filter(pkg => !pkg.deleted && pkg.locId != null)
        .map(pkg => pkg.locId as number)
    )
  ]
  return ids.length ? ids.map(id => locName(id, locations)).join(', ') : '—'
}

export const scheduledDays = (orders = rollformingStore.get().orders) => {
  const days = new Map<string, { date: string; lf: number }>()
  scheduledOrders(orders).forEach(order => {
    const date = order.productionDate
    if (!date) return
    const day = days.get(date) ?? { date, lf: 0 }
    // stock units consume no rolling capacity
    order.lineItems.forEach(item => (day.lf += unitLF(item) * rollCoils(item).length))
    days.set(date, day)
  })
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export const scheduledSort = (a: Order, b: Order) => {
  const ha = priorityById(a.priorityId)?.h ?? 99
  const hb = priorityById(b.priorityId)?.h ?? 99
  return ha !== hb ? ha - hb : a.order.localeCompare(b.order)
}

/** One order's line items in view order: stored order, or grouped by Product ID then Length. */
export const orderedLineItems = (
  order: Order,
  sortByProductId = rollformingStore.get().sortByProductId
) => {
  if (!sortByProductId[order.id]) return order.lineItems.map(item => ({ item, groupBreak: false }))

  const sorted = [...order.lineItems].sort((a, b) =>
    a.productId !== b.productId
      ? a.productId.localeCompare(b.productId)
      : (a.length || 0) - (b.length || 0)
  )
  return sorted.map((item, index) => ({
    item,
    groupBreak: index > 0 && sorted[index - 1]?.productId !== item.productId
  }))
}

export type QueueGroup = {
  key: string
  date: string | null
  productId: string
  color: string
  gauge: number
  profile: string
  priorityId: number | null
  supplierId: number | null
  coilNumber: string
  needsSlit: boolean
  slitDone: boolean
  workerAssigned: boolean
  count: number
  lf: number
  weight: number
  orders: string[]
}

/**
 * The Queue combines units into one row wherever production date, colour/gauge, profile, priority,
 * supplier, coil number and the slit decision all match, and sums their linear feet.
 */
export const queueGroups = (orders = rollformingStore.get().orders) => {
  const rows: (Omit<QueueGroup, 'orders'> & { orders: Set<string> })[] = []

  releasedOrders(orders).forEach(order => {
    if (isFullyWrapped(order)) return
    order.lineItems.forEach(item => {
      rollCoils(item).forEach((coil: CoilUnit) => {
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

        let group = rows.find(row => row.key === key)
        if (!group) {
          group = {
            key,
            date: order.productionDate,
            productId: item.productId,
            color: item.color,
            gauge: item.gauge,
            profile: item.profile,
            priorityId: order.priorityId,
            supplierId: coil.supplierId,
            coilNumber: coil.coilNumber,
            needsSlit: coil.needsSlit,
            slitDone: coil.slitDone,
            workerAssigned: false,
            count: 0,
            lf: 0,
            weight: 0,
            orders: new Set<string>()
          }
          rows.push(group)
        }
        if (coil.workerAssigned) group.workerAssigned = true
        group.count++
        group.lf += unitLF(item)
        group.weight += unitWeight(item)
        group.orders.add(order.order)
      })
    })
  })

  return rows.map(row => ({ ...row, orders: [...row.orders] }))
}

/**
 * The Queue's rows bucketed by production date. Priorities are shown but do not sort: the Manager
 * reorders by hand into `queueOrder[date]`, and colour is only a stable tiebreak so rows do not jump.
 */
export const queueGroupsSorted = (forGroup?: string, state = rollformingStore.get()) => {
  const group = forGroup || state.activeGroup
  const groups = queueGroups(state.orders).filter(row => {
    if (group === 'All') return true
    if (!row.profile) return true
    return (
      groupOf(row.profile) === group || (group === 'Slit Line' && row.needsSlit && !row.slitDone)
    )
  })

  const byDate = new Map<string, QueueGroup[]>()
  groups.forEach(row => {
    const date = row.date || ''
    byDate.set(date, [...(byDate.get(date) ?? []), row])
  })

  const saved = state.queueOrder
  return [...byDate.keys()].sort().map(date => ({
    date,
    rows: [...(byDate.get(date) as QueueGroup[])].sort((a, b) => {
      const order = saved[date]
      if (order) {
        const ia = order.indexOf(a.key)
        const ib = order.indexOf(b.key)
        if (ia !== -1 && ib !== -1) return ia - ib
      }
      return a.color.localeCompare(b.color)
    })
  }))
}

/** How many units are ticked on this order — the count the two bulk assignment buttons carry. */
export const bulkAssignAvailable = (
  orderId: number,
  ctx = rollformingStore.get().selectedCoilCtx
) => (ctx && ctx.orderId === orderId ? ctx.units.length : 0)

/** The Stock decision is the Manager's, and only until the order goes to production. */
export const stockGateOk = (orderId: number, state = rollformingStore.get()) => {
  const order = state.orders.find(candidate => candidate.id === orderId)
  return !!order && !order.released && state.role !== 'worker'
}

/** Production runs oldest day first, then by priority, then by order number. */
export const productionSort = (a: Order, b: Order) => {
  const da = a.productionDate || ''
  const db = b.productionDate || ''
  if (da !== db) return da.localeCompare(db)
  return scheduledSort(a, b)
}

/** What one machine still has to roll: released, not yet fully packaged, matching the search. */
export const productionOrdersFor = (group: string, state = rollformingStore.get()) =>
  releasedOrders(state.orders)
    .filter(
      order =>
        orderInGroup(order, group) &&
        !isDoneInProduction(order) &&
        orderMatchesSearch(order, state.searchTerm)
    )
    .sort(productionSort)

/** Coils are foldered per machine — Slit Line holds none, because it is a process, not a rollformer. */
export const MACHINE_GROUPS = GROUPS.filter(group => group !== 'Slit Line')

/**
 * Completed keeps 90 days. An order with no completion stamp is one the Wrapping Worker has not
 * finished placing yet — recently done by definition, so it is always kept.
 */
export const withinCompletedWindow = (order: Order) => {
  if (!order.completedAt) return true
  const days = Math.round(
    (new Date(`${TODAY}T00:00:00`).getTime() -
      new Date(`${order.completedAt.slice(0, 10)}T00:00:00`).getTime()) /
      86400000
  )
  return days <= 90
}

export const completedOrdersList = (orders = rollformingStore.get().orders) =>
  orders
    .filter(order => isDoneInProduction(order) && withinCompletedWindow(order))
    .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))

/** What the Wrapping Worker still has to place: released, packaged, and not yet fully located. */
export const wrappingOrders = (group: string, state = rollformingStore.get()) =>
  releasedOrders(state.orders).filter(
    order =>
      orderInGroup(order, group) &&
      !isFullyWrapped(order) &&
      (order.packages || []).length &&
      orderMatchesSearch(order, state.searchTerm)
  )
