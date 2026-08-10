import { shippingStore, TODAY } from './store'

import type { Load, LoadStatus, Order, Priority } from './types'

/**
 * Everything derived, under the prototype's own names, so its knowledge base still describes this code.
 *
 * A selector that reads the store takes what it reads as a trailing argument, defaulted to the live
 * value. The React Compiler keys a derived value on the reactive inputs it can *see*, and a call that
 * reaches into the store on its own shows it none — the board would answer once and then freeze on
 * stale rows. Components pass the slice they subscribed to; the default is for callers outside render.
 */

export const orderById = (id: number | null, orders = shippingStore.get().orders) =>
  orders.find(order => order.id === id)

export const loadById = (id: number | null, loads = shippingStore.get().loads) =>
  loads.find(load => load.id === id)

export const truckById = (id: number | null, trucks = shippingStore.get().trucks) =>
  trucks.find(truck => truck.id === id)

export const priorityById = (
  id: number | null,
  priorities = shippingStore.get().priorities
): Priority | null => priorities.find(priority => priority.id === id) ?? null

export const isPast = (iso: string | null) => !!iso && iso < TODAY

export const orderOverdue = (order: Order) => isPast(order.shipDate) && order.status !== 'delivered'

export const ordersOn = (date: string, orders = shippingStore.get().orders) =>
  orders.filter(order => order.shipDate === date)

/** A day is overdue while anything shipping that day is past and still undelivered. */
export const dateOverdue = (date: string, orders = shippingStore.get().orders) =>
  isPast(date) && ordersOn(date, orders).some(order => order.status !== 'delivered')

export const unscheduledOrders = (orders = shippingStore.get().orders) =>
  orders.filter(order => !order.shipDate)

/**
 * Scheduled holds an order until its load is released to Loading — an unreleased load is still the
 * Manager's to change, so its orders keep showing here.
 */
export const scheduledOrders = (
  orders = shippingStore.get().orders,
  loads = shippingStore.get().loads
) =>
  orders.filter(
    order =>
      order.shipDate && (!order.loadId || loadById(order.loadId, loads)?.status === 'unreleased')
  )

/** Release To Loading puts a load in the Loading window at once; only unreleased ones are held back. */
export const loadingLoads = (loads = shippingStore.get().loads) =>
  loads.filter(load => load.status !== 'unreleased')

/**
 * The rows one truck's grid shows for one day.
 *
 * Render, Select All, Reschedule and Add To Load all go through here, so all four act on exactly the
 * rows on screen — a Select All that took orders the search had hidden would build the wrong Load.
 */
export const schedGridOrders = (
  truckId: number,
  activeDay: string,
  state = shippingStore.get()
) => {
  let orders = scheduledOrders(state.orders, state.loads).filter(
    order => order.truckId === truckId && (activeDay === 'all' || order.shipDate === activeDay)
  )
  if (state.loadFilter) orders = orders.filter(order => order.loadId === state.loadFilter)
  orders = orders.filter(order => orderMatchesSearch(order, state.search))

  const query = (state.schSearch || '').trim().toLowerCase()
  if (query)
    orders = orders.filter(order =>
      [order.order, order.customer].some(value => String(value).toLowerCase().includes(query))
    )

  return sortByPriority(orders, state.priorities)
}

/** A truck already out on the road cannot be given another load. */
export const truckHasEnRouteLoad = (truckId: number, loads = shippingStore.get().loads) =>
  loads.some(load => load.truckId === truckId && load.status === 'shipping')

export const sumWeight = (orders: Order[]) => orders.reduce((total, o) => total + o.weight, 0)

export const longestOf = (orders: Order[]) =>
  orders.reduce((longest, o) => Math.max(longest, o.longestLength || 0), 0)

/** Priority first, and an order with none sorts last rather than first. */
export const sortByPriority = (orders: Order[], priorities = shippingStore.get().priorities) =>
  orders
    .slice()
    .sort(
      (a, b) =>
        (priorityById(a.priorityId, priorities)?.hierarchy ?? 999) -
        (priorityById(b.priorityId, priorities)?.hierarchy ?? 999)
    )

export const loadWeight = (load: Load, orders = shippingStore.get().orders) =>
  load.orderIds.reduce((total, id) => total + (orderById(id, orders)?.weight ?? 0), 0)

/** A load is labelled by its position among its truck's loads, so L-1 is that truck's first. */
export const loadLabel = (load: Load, loads = shippingStore.get().loads) => {
  const same = loads.filter(other => other.truckId === load.truckId).sort((a, b) => a.id - b.id)
  return `L-${same.findIndex(other => other.id === load.id) + 1}`
}

/**
 * The key the cross-page slice files a load under — `truck101-load2`.
 *
 * It is the load's position among its truck's loads, not its id: the other screens know a load by
 * where it sits in that truck's day, and an id is this page's private business.
 */
export const loadKeyForLoad = (load: Load, loads = shippingStore.get().loads) => {
  const same = loads.filter(other => other.truckId === load.truckId).sort((a, b) => a.id - b.id)
  const index = same.findIndex(other => other.id === load.id)
  return index < 0 ? null : `truck${load.truckId}-load${index + 1}`
}

/** A new load is named for the one after its truck's last. */
export const nextLoadLabel = (truckId: number, loads = shippingStore.get().loads) =>
  `L-${loads.filter(load => load.truckId === truckId).length + 1}`

/** The days the board offers, each with how many orders ship on it. */
export const schedDays = (
  orders = shippingStore.get().orders,
  loads = shippingStore.get().loads
) => {
  const days = new Map<string, { date: string; count: number }>()

  for (const order of scheduledOrders(orders, loads)) {
    if (!order.shipDate) continue
    const day = days.get(order.shipDate) ?? { date: order.shipDate, count: 0 }
    day.count++
    days.set(order.shipDate, day)
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** The days the Loading board offers, each with how many loads run on it. */
export const loadingDays = (loads = shippingStore.get().loads) => {
  const days = new Map<string, { date: string; count: number }>()

  for (const load of loadingLoads(loads)) {
    const day = days.get(load.date) ?? { date: load.date, count: 0 }
    day.count++
    days.set(load.date, day)
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export const truckOverdue = (truckId: number, date: string, orders = shippingStore.get().orders) =>
  isPast(date) &&
  ordersOn(date, orders)
    .filter(order => order.truckId === truckId)
    .some(order => order.status !== 'delivered')

export const noteState = (notes: { dealt: boolean }[] | undefined) => {
  if (!notes || !notes.length) return 'none'
  return notes.some(note => !note.dealt) ? 'unread' : 'read'
}

export const orderMatchesSearch = (order: Order, search = shippingStore.get().search) => {
  const query = search.trim().toLowerCase()
  if (!query) return true
  return [order.order, order.customer, order.address, order.city].some(value =>
    String(value ?? '')
      .toLowerCase()
      .includes(query)
  )
}

const STATUS_LABELS: Record<string, string> = {
  unreleased: 'Unreleased',
  notstarted: 'Not Started',
  loading: 'Loading',
  loaded: 'Loaded',
  shipping: 'En Route',
  shipped: 'Delivered',
  delivered: 'Delivered'
}

const STATUS_CLASSES: Record<string, string> = {
  unreleased: 'ss-unreleased',
  notstarted: 'ss-notstarted',
  loading: 'ss-loading',
  loaded: 'ss-loaded',
  shipping: 'ss-shipping',
  shipped: 'ss-delivered',
  delivered: 'ss-delivered'
}

export const loadStatusLabel = (status: LoadStatus | '') => STATUS_LABELS[status] ?? status

export const loadStatusCls = (status: LoadStatus | '') => STATUS_CLASSES[status] ?? 'ss-blank'

/**
 * The packing and line-item detail is derived from the order rather than seeded.
 *
 * It is a hash, not a random number, and that is the whole point: the same order gives the same
 * packages on every render and in both builds, so the gate compares like with like and a comment
 * anchored to `uns-li-1-2` keeps meaning the same row. FNV-1a, ported digit for digit — a different
 * hash is different data.
 */
/**
 * Which department made the canonical demo orders. Everything else is Trim.
 *
 * A barcode is `<dept>-<order>-<seq>`, and the other screens scan exactly that string — so a package
 * created here has to be numbered the way the department that built it would have numbered it.
 */
const ORDER_DEPT: Record<string, string> = {
  '330618': '01',
  '330630': '01',
  '330622': '02',
  '330633': '01'
}

export const barcodeFor = (order: string, seq: number) =>
  `${ORDER_DEPT[order] ?? '01'}-${order}-${String(seq).padStart(2, '0')}`

export const pkgHash = (order: string, index: number) => {
  let n = 2166136261
  const source = `${order}:${index}`
  for (let position = 0; position < source.length; position++) {
    n ^= source.charCodeAt(position)
    // `n * 16777619`, not `Math.imul` — the product passes 2^53 and loses low bits before `>>> 0`
    // truncates it. The exact answer would be a *different* hash, and so different data.
    n = (n * 16777619) >>> 0
  }
  return n
}

const LINE_PRODUCTS = [
  { id: 'PROOF26', desc: 'Roof Panel' },
  { id: 'PWALL26', desc: 'Wall Panel' },
  { id: 'TRIDGE26', desc: 'Ridge Cap' },
  { id: 'TVALLEY24', desc: 'Valley Flashing' },
  { id: 'TDRIP26', desc: 'Drip Edge' },
  { id: 'TGABLE26', desc: 'Gable / Rake Trim' },
  { id: 'TCORNER26', desc: 'Outside Corner' },
  { id: 'TJCHAN24', desc: 'J-Channel' },
  { id: 'FCLOSURE', desc: 'Foam Closure Strip' },
  { id: 'HFASTEN', desc: 'Fasteners' }
]

const LINE_COLORS = [
  'Charcoal',
  'Barn Red',
  'Bright White',
  'Galvalume',
  'Hawaiian Blue',
  'Evergreen',
  'Burnished Slate'
]

const LINE_GAUGES = ['26ga', '24ga', '29ga']

export type LineMeta = {
  productId: string
  description: string
  gauge: string
  color: string
  qty: number
  length: number
  weight: number
}

/** The order's actual contents — products and quantities, not how they are packed. */
export const lineMeta = (order: Order): LineMeta[] => {
  const count = 2 + (pkgHash(order.order, 101) % 4)
  const out: LineMeta[] = []
  let accumulated = 0

  for (let index = 0; index < count; index++) {
    const hash = pkgHash(order.order, 200 + index)
    // stepping by 3 keeps every line a distinct product: at most 5 lines out of 10 products
    const product = LINE_PRODUCTS[
      (pkgHash(order.order, 55) + index * 3) % LINE_PRODUCTS.length
    ] as (typeof LINE_PRODUCTS)[number]
    const accessory = product.id === 'FCLOSURE' || product.id === 'HFASTEN'
    const gauge = LINE_GAUGES[Math.floor(hash / 8) % LINE_GAUGES.length] as string
    const color = LINE_COLORS[Math.floor(hash / 64) % LINE_COLORS.length] as string
    const qty = accessory ? 2 + (hash % 20) : 6 + (hash % 60)
    const length = accessory
      ? 0
      : index === 0
        ? order.longestLength
        : Math.max(24, Math.round(order.longestLength * (0.4 + (hash % 50) / 100)))

    let weight: number
    if (index < count - 1) {
      weight = Math.max(25, Math.round((order.weight / count) * (0.7 + (hash % 50) / 100)))
      accumulated += weight
    } else {
      // the last line carries the remainder, so the column always sums to the order's weight
      weight = Math.max(25, order.weight - accumulated)
    }

    out.push({
      productId: product.id,
      description: product.desc,
      gauge: accessory ? '' : gauge,
      color: accessory ? '' : color,
      qty,
      length,
      weight
    })
  }

  return out
}
