import { isWorkDay } from '@/store/shared/settings'

import { RANK, TODAY, trimStore } from './store'

import type { LineItem, Location, Note, Order, Priority, Reman } from './types'

/**
 * How many bends a profile takes is a property of the profile, not of the order: the Machine Capacities
 * report counts Pieces and Bends as different metrics (#174), and Trim's capacity is bends per day
 * (#173). A profile that is not listed counts as one bend.
 */
const BENDS_PER: Record<string, number> = {
  TSWB262: 3,
  TDRIP24: 2,
  TRAKE24: 3,
  TVAL26: 2,
  TGABLE26: 4,
  TRIDGE26: 4,
  TDE8262: 3,
  TWCAP24: 5,
  TCORN26: 2
}

/** Stock covers part of the order, so only the remainder is manufactured. */
export const qtyToMake = (item: LineItem) => Math.max(0, item.qty - (item.fromStock || 0))

export const lineBends = (item: LineItem) => qtyToMake(item) * (BENDS_PER[item.productId] || 1)

/**
 * The production day of a single line (#172). Only a split order carries per-line dates; a plain
 * order's lines all follow the order's own date. `null` means still unscheduled.
 */
export const lineDay = (order: Order, item: LineItem) =>
  item.scheduledDate || (order.isSplit ? null : order.productionDate)

/**
 * An order stays in Unscheduled while *any* of its lines has no day — so a split order whose remaining
 * trim has since been scheduled leaves the tab on its own (#172).
 */
/**
 * These take the orders rather than reading the store, deliberately.
 *
 * A selector with no arguments is one the React Compiler is free to call once and keep the answer —
 * the tab counts in the header stayed on their seed values after the first order was scheduled, while
 * the table below them was already right. Passing the list the caller is subscribed to makes the
 * dependency real.
 */
export const unscheduledOrders = (orders: Order[] = trimStore.get().orders) =>
  orders.filter(order => order.lineItems.some(item => !lineDay(order, item)))

export const scheduledOrders = (orders: Order[] = trimStore.get().orders) =>
  orders.filter(order => order.productionDate && !order.completed)

export const priorityById = (id: number | null): Priority | null =>
  trimStore.get().priorities.find(priority => priority.id === id) ?? null

/** The plant's daily ceiling — the `Y` in every `(X / Y)` glance. */
export const totalDailyCap = () =>
  trimStore.get().machines.reduce((sum, machine) => sum + (machine.dailyMax || 0), 0)

export const noteState = (notes: Note[] | undefined) => {
  if (!notes?.length) return 'none'
  return notes.some(note => !note.dealt) ? 'unread' : 'read'
}

export const orderMatchesSearch = (order: Order) => {
  const query = trimStore.get().searchTerm.trim().toLowerCase()
  if (!query) return true
  if (order.order.toLowerCase().includes(query)) return true
  if (order.customer.toLowerCase().includes(query)) return true
  return order.lineItems.some(
    item =>
      item.productId.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
  )
}

/** Bends and order counts per scheduled day, which is what the day strips and day tabs show. */
export const scheduledDays = () => {
  const days: Record<string, { date: string; bends: number; orders: number }> = {}
  const touch = (date: string) => (days[date] ??= { date, bends: 0, orders: 0 })

  for (const order of scheduledOrders()) {
    const own = new Set<string>()
    for (const item of order.lineItems) {
      const day = lineDay(order, item)
      if (!day) continue
      touch(day).bends += lineBends(item)
      own.add(day)
    }
    for (const day of own) touch(day).orders += 1
  }

  return Object.values(days).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Walks forward over work days only — weekends and holidays are skipped, not counted.
 *
 * Bounded, and then checked: a Settings week with every day switched off would otherwise walk forever,
 * so the search gives up after a year and the strip falls back to plain calendar days. A day strip
 * showing the wrong days is a bug; one showing none is a hung tab.
 */
export const nextWorkDays = (startIso: string, count: number) => {
  const out: string[] = []
  const cursor = new Date(`${startIso}T00:00:00Z`)

  for (let guard = 0; out.length < count && guard < 400; guard += 1) {
    const iso = cursor.toISOString().slice(0, 10)
    if (isWorkDay(iso)) out.push(iso)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  if (out.length) return out

  const fallback = new Date(`${startIso}T00:00:00Z`)
  for (let index = 0; index < count; index += 1) {
    out.push(fallback.toISOString().slice(0, 10))
    fallback.setUTCDate(fallback.getUTCDate() + 1)
  }
  return out
}

export const isOverdue = (iso: string | null) => !!iso && iso < TODAY

/**
 * Slinet and Wrapping are not configurable machines — they are the gateway in and the terminal step
 * out, and the prototype answers for them without consulting the machine list.
 */
export const machineById = (id: number | null) =>
  id === 1
    ? { id: 1, name: 'Slinet', dailyMax: 0 }
    : id === 7
      ? { id: 7, name: 'Wrapping', dailyMax: 0 }
      : (trimStore.get().machines.find(machine => machine.id === id) ?? null)

export const locById = (id: number) =>
  trimStore.get().locations.find(location => location.id === id) ?? null

/** N-112: vented pieces, capped to what is actually being made. */
export const ventedOf = (item: LineItem) => Math.min(item.vented || 0, qtyToMake(item))

/** A line needs a machine only if there is something left to manufacture. */
export const needsMachine = (item: LineItem) => qtyToMake(item) > 0

export const allMachinesAssigned = (order: Order) =>
  order.lineItems.every(item => !needsMachine(item) || item.machineId)

/** N-019/020/021/037. Empty is a real value: nothing is claimed about a line before release. */
export const lineStatus = (order: Order, item: LineItem) => {
  if (item.status) return item.status
  if ((item.fromStock || 0) >= item.qty) return 'stock'
  if (order.released) return 'not_started'
  return ''
}

export const productionStatus = (order: Order) => {
  const statusOf = (item: LineItem) => item.status || lineStatus(order, item)
  if (order.lineItems.every(item => statusOf(item) === 'wrapped')) return 'complete'
  if (order.lineItems.some(item => ['cut', 'bent', 'wrapped'].includes(statusOf(item))))
    return 'in_progress'
  return 'not_started'
}

/** Priority first, order number second — the order the floor reads the day's work in. */
export const sortScheduled = (a: Order, b: Order) => {
  const left = priorityById(a.priorityId)
  const right = priorityById(b.priorityId)
  const rankLeft = left ? left.hierarchy : 99
  const rankRight = right ? right.hierarchy : 99
  if (rankLeft !== rankRight) return rankLeft - rankRight
  return a.order.localeCompare(b.order)
}

/** #203: location codes are globally unique, so the label carries no warehouse. */
export const orderLocLabel = (order: Order) => {
  const ids = order.locationIds ?? []
  if (!ids.length) return '—'
  return ids.map(id => locById(id)?.code ?? '—').join(', ')
}

/**
 * A release is all-stock or all-customer, never mixed (type exclusion), so the type of the first
 * selected order decides what the rest of the selection may contain.
 */
export const releaseType = () => {
  const state = trimStore.get()
  const [first] = state.releaseIds
  if (first === undefined) return null
  return state.orders.find(order => order.id === first)?.type ?? null
}

export const completedOrders = () => {
  const cutoff = new Date(`${TODAY}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - 90)
  const cutoffIso = cutoff.toISOString().slice(0, 10)

  return trimStore
    .get()
    .orders.filter(
      order => order.completed && (order.completedDate || order.productionDate || '') >= cutoffIso
    )
}

export const lineOf = (orderId: number, lineId: number, orders = trimStore.get().orders) => {
  const order = orders.find(candidate => candidate.id === orderId)
  const item = order?.lineItems.find(candidate => candidate.id === lineId)
  return order && item ? { order, item } : null
}

/** The five bendlist machines, as per-piece columns on the expanded Slinet cutlist (§194). */
export const MACHINE_TABS = [
  { id: 1, name: 'Slinet', gateway: true },
  { id: 2, name: 'Press Brake' },
  { id: 3, name: 'V1' },
  { id: 4, name: 'V2' },
  { id: 5, name: 'Rollformer' },
  { id: 6, name: 'Caps' },
  { id: 7, name: 'Wrapping', terminal: true }
] as const

export const BENDLIST_MACHINES = MACHINE_TABS.filter(
  machine => !('gateway' in machine) && !('terminal' in machine)
)

export type BatchItem = LineItem & {
  orderNo: string
  orderId: number
  customer: string
  isStock: boolean
}

/**
 * Slinet sees every manufacturing line as one cutlist; a machine tab sees only the lines routed to
 * it, as a bendlist. Same batches either way — the difference is which lines are in them.
 */
export const computeBatches = (
  machineId: number | null,
  isSlinet: boolean,
  state = trimStore.get()
) =>
  state.cutlists
    .map(cutlist => ({
      ...cutlist,
      items: cutlist.members
        .map(member => {
          const found = lineOf(member.orderId, member.lineId, state.orders)
          if (!found) return null
          return {
            ...found.item,
            orderNo: found.order.order,
            orderId: found.order.id,
            customer: found.order.customer,
            isStock: found.order.type === 'stock'
          } satisfies BatchItem
        })
        .filter((item): item is BatchItem => !!item)
        .filter(item => isSlinet || item.machineId === machineId)
    }))
    .filter(cutlist => cutlist.items.length)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (priorityById(a.priorityId)?.hierarchy || 99) -
          (priorityById(b.priorityId)?.hierarchy || 99) ||
        a.gaugeColour.localeCompare(b.gaugeColour)
    )

/** Whether a consolidated row has all, some or none of its lines past a station's step. */
export { RANK }

/** Whether a consolidated row has all, some or none of its lines past a station's step. */
export const groupStepState = (items: BatchItem[], stepRank: number) => {
  const done = items.filter(item => (RANK[item.status ?? ''] || 0) >= stepRank).length
  if (done === 0) return 'none'
  if (done === items.length) return 'done'
  return 'partial'
}

/**
 * Everything scheduled to one day, whether or not it has been routed to a machine.
 *
 * This and `machineTotals` are two different populations, and the gap between them is the point: trim
 * that has a day but no machine yet. Summing the machines instead would hide exactly the work nobody
 * has claimed.
 */
export const dayScheduledTotals = (iso: string, orders = trimStore.get().orders) => {
  let pieces = 0
  let bends = 0
  let stockPieces = 0
  let stockBends = 0

  for (const order of scheduledOrders(orders))
    for (const item of order.lineItems) {
      if (lineDay(order, item) !== iso) continue

      const linePieces = qtyToMake(item)
      const lineBendCount = lineBends(item)
      pieces += linePieces
      bends += lineBendCount
      if (order.type === 'stock') {
        stockPieces += linePieces
        stockBends += lineBendCount
      }
    }

  return { pieces, bends, stockPieces, stockBends }
}

/**
 * #209: the same strip for the Slinet, which is not a machine.
 *
 * Everything in the day's cutlists counts, whatever machine each line is routed to afterwards — the
 * Slinet cuts all of it — and there is no daily max for it to be over.
 */
export const slinetTotals = (iso: string, state = trimStore.get()) => {
  let pieces = 0
  let bends = 0
  let stockPieces = 0
  let stockBends = 0

  for (const cutlist of state.cutlists) {
    if (cutlist.date !== iso) continue
    for (const member of cutlist.members) {
      const found = lineOf(member.orderId, member.lineId, state.orders)
      if (!found) continue
      const linePieces = qtyToMake(found.item)
      const lineBendCount = lineBends(found.item)
      pieces += linePieces
      bends += lineBendCount
      if (found.order.type === 'stock') {
        stockPieces += linePieces
        stockBends += lineBendCount
      }
    }
  }

  return { pieces, bends, stockPieces, stockBends, dailyMax: 0 }
}

/** What one machine has been given for one day — the numbers on the totals strip. */
export const machineTotals = (machineId: number | null, iso: string, state = trimStore.get()) => {
  let pieces = 0
  let bends = 0
  let stockPieces = 0
  let stockBends = 0

  for (const cutlist of state.cutlists) {
    if (cutlist.date !== iso) continue
    for (const member of cutlist.members) {
      const found = lineOf(member.orderId, member.lineId, state.orders)
      if (!found || found.item.machineId !== machineId) continue
      const linePieces = qtyToMake(found.item)
      const lineBendCount = lineBends(found.item)
      pieces += linePieces
      bends += lineBendCount
      if (found.order.type === 'stock') {
        stockPieces += linePieces
        stockBends += lineBendCount
      }
    }
  }

  const machine = trimStore.get().machines.find(candidate => candidate.id === machineId)
  return { pieces, bends, stockPieces, stockBends, dailyMax: machine?.dailyMax || 0 }
}

const remanSort = (a: Reman, b: Reman) =>
  a.date.localeCompare(b.date) ||
  (priorityById(a.priorityId)?.hierarchy || 99) - (priorityById(b.priorityId)?.hierarchy || 99)

/** #192: `done` is what flips a list from a station's active queue to its Completed tab. */
export const remanCutlistEntries = (done: boolean, remans = trimStore.get().remans) =>
  remans.filter(reman => !reman.slinetDone === !done).sort(remanSort)

export const remanBendlistEntries = (
  machineId: number | null,
  done: boolean,
  remans = trimStore.get().remans
) =>
  remans
    .filter(reman => reman.machineId === machineId && !reman.machineDone === !done)
    .sort(remanSort)

export const remanIsStock = (reman: Reman) =>
  trimStore.get().orders.find(order => order.id === reman.orderId)?.type === 'stock'

/* -- Wrapping ---------------------------------------------------------------------------------- */

/** Mock pounds per piece — the real system weighs the profile. */
export const estWeight = (item: LineItem) => Math.max(1, Math.round(item.width * 0.6))

export const wrapLeftOf = (item: LineItem) => Math.max(0, item.qty - (item.wrapped || 0))

/** N-075: only a line the floor has finished — or one that came off stock — can be wrapped. */
export const wrapEligible = (order: Order, item: LineItem) => {
  const status = item.status || lineStatus(order, item)
  return ['bent', 'stock', 'bypassed'].includes(status) && wrapLeftOf(item) > 0
}

export const activeLocationId = (order: Order) => order.locationIds?.at(-1) ?? null

/** An order's earlier locations — all but the most recently picked — lock for that order only. */
export const isLocationLockedForOrder = (order: Order, locationId: number) => {
  const ids = order.locationIds ?? []
  const at = ids.indexOf(locationId)
  return at !== -1 && at !== ids.length - 1
}

export const locOccupants = (location: Location) => location.occupants ?? []

export const locCurrentWeight = (location: Location) =>
  locOccupants(location).reduce((sum, occupant) => sum + occupant.weight, 0)

export const isLocationOverWeight = (location: Location) =>
  locCurrentWeight(location) > (location.maxWeight as number)

export const locOccupantCount = (location: Location) => locOccupants(location).length

export const isMultiLocation = (location: Location) => ((location.maxOrders as number) || 1) > 1

/**
 * A single-order cell is full the moment anything sits on it. A multi-order cell fills by count or by
 * weight, whichever runs out first — a bay with room for four orders is still full at its weight.
 */
export const isLocationFull = (location: Location) =>
  isMultiLocation(location)
    ? locOccupantCount(location) >= (location.maxOrders as number) ||
      locCurrentWeight(location) >= (location.maxWeight as number)
    : locOccupantCount(location) >= 1

/** The columns of each department's location grid: a code's first character is what kind of cell it is. */
export const LOC_SCHEMES: Record<string, { prefix: string; label: string }[]> = {
  Trim: [
    { prefix: '1', label: '1 of 1' },
    { prefix: '2', label: 'Wooden' },
    { prefix: '3', label: 'Small' },
    { prefix: '4', label: 'Medium' },
    { prefix: '5', label: 'Large' },
    { prefix: '6', label: 'Long' }
  ],
  Rollforming: [
    { prefix: 'A', label: 'Rack' },
    { prefix: 'B', label: 'Cart' },
    { prefix: 'C', label: 'Lumber' },
    { prefix: 'D', label: 'Lumber' },
    { prefix: 'E', label: 'Long' }
  ],
  Accessories: [
    { prefix: 'F', label: 'Rack' },
    { prefix: 'G', label: 'Cart' },
    { prefix: 'H', label: 'Lumber' },
    { prefix: 'I', label: 'Lumber' },
    { prefix: 'J', label: 'Long' }
  ]
}

/** PO# and Salesman are not modelled; both are deterministic demo values off the order number. */
const numFromOrderNo = (orderNo: string) => Number(/(\d+)$/.exec(orderNo)?.[1] ?? 0)

export const demoPo = (orderNo: string) => `PO-${orderNo.replace(/\D/g, '')}`

const DEMO_SALESMEN = ['Joel Thiessen', 'Marcus Reid', 'Hannah Weir', 'Dave Enns']

export const demoSalesman = (orderNo: string) =>
  DEMO_SALESMEN[numFromOrderNo(orderNo) % DEMO_SALESMEN.length]!
