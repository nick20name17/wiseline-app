import { shippingStore, TODAY } from './store'

import type { LoadStatus, Order, Priority } from './types'

/** Everything derived, under the prototype's own names, so its knowledge base still describes this code. */

export const orderById = (id: number) => shippingStore.get().orders.find(order => order.id === id)

export const loadById = (id: number | null) =>
  shippingStore.get().loads.find(load => load.id === id)

export const priorityById = (id: number | null): Priority | null =>
  shippingStore.get().priorities.find(priority => priority.id === id) ?? null

export const isPast = (iso: string | null) => !!iso && iso < TODAY

export const orderOverdue = (order: Order) => isPast(order.shipDate) && order.status !== 'delivered'

export const unscheduledOrders = () => shippingStore.get().orders.filter(order => !order.shipDate)

/**
 * Scheduled holds an order until its load is released to Loading — an unreleased load is still the
 * Manager's to change, so its orders keep showing here.
 */
export const scheduledOrders = () =>
  shippingStore
    .get()
    .orders.filter(
      order => order.shipDate && (!order.loadId || loadById(order.loadId)?.status === 'unreleased')
    )

/** Release To Loading puts a load in the Loading window at once; only unreleased ones are held back. */
export const loadingLoads = () =>
  shippingStore.get().loads.filter(load => load.status !== 'unreleased')

export const sumWeight = (orders: Order[]) => orders.reduce((total, o) => total + o.weight, 0)

export const longestOf = (orders: Order[]) =>
  orders.reduce((longest, o) => Math.max(longest, o.longestLength || 0), 0)

/** Priority first, and an order with none sorts last rather than first. */
export const sortByPriority = (orders: Order[]) =>
  orders
    .slice()
    .sort(
      (a, b) =>
        (priorityById(a.priorityId)?.hierarchy ?? 999) -
        (priorityById(b.priorityId)?.hierarchy ?? 999)
    )

export const noteState = (notes: { dealt: boolean }[] | undefined) => {
  if (!notes || !notes.length) return 'none'
  return notes.some(note => !note.dealt) ? 'unread' : 'read'
}

export const orderMatchesSearch = (order: Order) => {
  const query = shippingStore.get().search.trim().toLowerCase()
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
const pkgHash = (order: string, index: number) => {
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
