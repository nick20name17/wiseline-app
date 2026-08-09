import { releaseStamps, shippedKey } from '@/store/shared/locations'
import { isPackageLoaded } from '@/store/shared/shipping'

import { accessoriesStore, TODAY } from './store'

import type { LineItem, Location, Order, Priority } from './types'

/** Everything derived, under the prototype's own names, so its knowledge base still describes this code. */

export const priorityById = (id: number | null): Priority | null =>
  accessoriesStore.get().priorities.find(priority => priority.id === id) ?? null

export const priHierarchy = (id: number | null) => priorityById(id)?.hierarchy ?? 999

export const noteState = (notes: { dealt: boolean }[] | undefined) => {
  if (!notes || !notes.length) return 'none'
  return notes.some(note => !note.dealt) ? 'unread' : 'read'
}

/**
 * Left To Package neither zero nor the whole order means work has started; zero means done, and the
 * Auto Fill button greys out with it.
 */
export const itemStatus = (item: LineItem) => {
  if (item.leftToPackage === item.qtyOrdered) return 'not_started'
  if (item.leftToPackage === 0) return 'packaged'
  return 'in_progress'
}

export const orderPkgStatus = (order: Order) => {
  const statuses = scheduledLineItemsOf(order).map(itemStatus)
  if (!statuses.length) return 'not_started'
  if (statuses.every(status => status === 'packaged')) return 'packaged'
  if (statuses.some(status => status !== 'not_started')) return 'in_progress'
  return 'not_started'
}

/** Overdue is an earlier Prep Date that is still not fully packaged. */
export const isOverdue = (order: Order) =>
  !order.completed &&
  !!order.prepDate &&
  order.prepDate < TODAY &&
  orderPkgStatus(order) !== 'packaged'

/** A Pickup takes no truck at all; an unassigned Delivery is blank rather than "none". */
export const truckDisplay = (order: Order) =>
  order.shipVia === 'Pickup' ? 'N/A' : (order.truck ?? '')

export const activeOrders = () => accessoriesStore.get().orders.filter(order => !order.completed)

/** A split order is in both lists at once: its unscheduled remainder still needs a Prep Date. */
export const unscheduledOrders = () =>
  activeOrders().filter(order => !order.prepDate || order.isSplit)

export const scheduledOrders = () => activeOrders().filter(order => order.prepDate)

export const unscheduledLineItemsOf = (order: Order) =>
  order.isSplit ? order.items.filter(item => !item.scheduledDate) : order.items

export const scheduledLineItemsOf = (order: Order) =>
  order.isSplit ? order.items.filter(item => item.scheduledDate === order.prepDate) : order.items

const daysSinceCompleted = (order: Order) =>
  Math.round(
    (new Date(`${TODAY}T00:00:00`).getTime() -
      new Date(`${order.completedDate}T00:00:00`).getTime()) /
      86400000
  )

/** Completed Orders keeps 90 days of history from TODAY; older rows age out of the tab. */
export const completedOrdersList = () =>
  accessoriesStore
    .get()
    .orders.filter(order => order.completed && daysSinceCompleted(order) <= 90)
    .sort((a, b) => ((a.completedDate ?? '') < (b.completedDate ?? '') ? 1 : -1))

export const matchesSearch = (order: Order) => {
  const query = accessoriesStore.get().search.trim().toLowerCase()
  if (!query) return true
  return [order.orderNumber, order.customer, order.po].some(field =>
    String(field ?? '')
      .toLowerCase()
      .includes(query)
  )
}

/** Prep Date always outranks Priority. */
export const scheduledSort = (a: Order, b: Order) =>
  a.prepDate !== b.prepDate
    ? (a.prepDate ?? '') < (b.prepDate ?? '')
      ? -1
      : 1
    : priHierarchy(a.priorityId) - priHierarchy(b.priorityId)

export const sortedActive = () =>
  scheduledOrders().filter(matchesSearch).slice().sort(scheduledSort)

export const scheduledDays = () => {
  const days = new Map<string, { date: string; count: number; overdue: number }>()

  for (const order of scheduledOrders()) {
    if (!order.prepDate) continue
    const day = days.get(order.prepDate) ?? { date: order.prepDate, count: 0, overdue: 0 }
    day.count++
    if (isOverdue(order)) day.overdue++
    days.set(order.prepDate, day)
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** What the package being built weighs, before it is printed and becomes real. */
export const stagedWeight = (order: Order) =>
  order.items.reduce(
    (sum, item) => sum + (item.packaging > 0 ? item.packaging * item.unitWeight : 0),
    0
  )

export const locById = (id: number) =>
  accessoriesStore.get().locations.find(location => location.id === id) ?? null

export const locCurrentWeight = (location: Location) =>
  location.occupants.reduce((sum, occupant) => sum + occupant.weight, 0)

export const isLocationOverWeight = (location: Location) =>
  locCurrentWeight(location) > location.maxWeight

/** An order's earlier locations — all but the most recently picked — lock for that order only. */
export const isLocationLockedForOrder = (order: Order, locationId: number) => {
  const ids = order.locationIds ?? []
  const index = ids.indexOf(locationId)
  return index !== -1 && index !== ids.length - 1
}

const lastActivePackage = (order: Order) => {
  const live = order.packages.filter(pkg => !pkg.deleted)
  return live.length ? (live[live.length - 1] as (typeof live)[number]) : null
}

/**
 * When this order's release countdown starts, or `null` if it has not started at all.
 *
 * A location frees only on a manual removal, or 15 minutes after Shipping scans the order's *last*
 * package onto a truck. Until that scan the location is held indefinitely — so `null` here means "held
 * until shipped", not "released a moment ago", and the two must not be conflated.
 */
export const effectiveScanTs = (order: Order, now: number) => {
  const pkg = lastActivePackage(order)
  if (!pkg?.code) return null
  const loaded = isPackageLoaded(pkg.code)
  if (loaded !== true) return null

  const key = shippedKey(pkg.locationId ?? 0, order.id)
  const stamps = releaseStamps('acc')
  const existing = stamps.get()[key]
  if (typeof existing === 'number' && Number.isFinite(existing)) return existing

  stamps.set({ ...stamps.get(), [key]: now })
  return now
}

export const AUTO_RELEASE_MS = 15 * 60 * 1000

export const fmtCountdown = (msLeft: number) => {
  const total = Math.max(0, Math.ceil(msLeft / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export const STATUS_MAP: Record<string, [string, string]> = {
  not_started: ['st-notstarted', 'Not Started'],
  in_progress: ['st-inprogress', 'In Progress'],
  packaged: ['st-packaged', 'Packaged']
}
