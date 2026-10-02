import { stamp } from './dates'
import { lines } from './state'
import type { Line } from './types'

export type StockCard = {
  id: number
  product_id: string
  stock_minimum: number
  order_qty: number
  image_id: number | null
  width: number | null
}

export type Batch = {
  id: number
  order: string | null
  ebms_batch: string
  created_at: string
  lines: { product_id: string; quantity: number; origin_item: string | null }[]
}

export type Reman = {
  id: number
  order: string
  origin_item: string
  department: number
  source: string
  remanufacturing_qty: number
  pull_from_stock_qty: number
  note: string | null
  is_cut: boolean
  is_bent: boolean
}

/** A Trim product as EBMS knows it: whatever line items already carry its id. */
export const trimProduct = (productId: string) =>
  lines.find(line => line.dept === 1 && line.product_id === productId) ?? null

export const stockCards: StockCard[] = [
  ['DRIP-EDGE-A-24-BLK', 400, 600, 8],
  ['DRIP-EDGE-A-24-MBK', 200, 300, 8],
  ['J-CHANNEL-34-24-BNW', 300, 400, null],
  ['RAKE-TRIM-5-26-CHR', 150, 250, 10],
  ['FASCIA-6-24-BLK', 120, 200, 10.5],
  ['RIDGE-FLAT-26-GLV', 100, 150, null],
  ['CORNER-OUT-4-24-BNW', 80, 120, 11],
  ['GABLE-TRIM-24-MBK', 90, 150, 9]
].map(([product_id, stock_minimum, order_qty, width], index) => ({
  id: index + 1,
  product_id: product_id as string,
  stock_minimum: stock_minimum as number,
  order_qty: order_qty as number,
  image_id: null,
  width: width as number | null
}))

export const batches: Batch[] = [
  {
    id: 1,
    order: null,
    ebms_batch: 'MB-20418',
    created_at: stamp(3, 15, 10),
    lines: [{ product_id: 'DRIP-EDGE-A-24-BLK', quantity: 120, origin_item: null }]
  },
  {
    id: 2,
    order: 'S1041',
    ebms_batch: 'MB-20431',
    created_at: stamp(1, 14, 45),
    lines: [{ product_id: 'DRIP-EDGE-A-24-MBK', quantity: 80, origin_item: null }]
  }
]

export const remans: Reman[] = []

export const seedRemans = () => {
  const line = lines.find(row => row.order === '41212' && row.dept === 1)
  if (!line) return
  remans.push({
    id: 1,
    order: line.order,
    origin_item: line.id,
    department: 1,
    source: 'wrapping',
    remanufacturing_qty: 6,
    pull_from_stock_qty: 0,
    note: 'Dented in the bundle, found at the bench',
    is_cut: true,
    is_bent: false
  })
}

export const describe = (productId: string) => trimProduct(productId)?.description ?? productId

export const cardOf = (card: StockCard) => {
  const product = trimProduct(card.product_id)
  return {
    id: card.id,
    product_id: card.product_id,
    description: product?.description ?? null,
    stock_minimum: card.stock_minimum,
    order_qty: card.order_qty,
    image_id: card.image_id,
    image_url: card.image_id ? placeholderPicture(card.product_id) : null,
    qr_payload: `STOCKCARD:${card.id}`,
    width: card.width,
    width_from_orders: product?.width ?? null,
    color: product?.color ?? null,
    gauge: product?.gauge ?? null
  }
}

/** A flat grey tile standing in for an uploaded photo. */
export const placeholderPicture = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#e5e7eb"/><text x="120" y="86" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#6b7280">${label}</text></svg>`
  )}`

/** A bend drawing for a Trim line: a polyline with one corner per bend. */
export const drawing = (line: Line) => {
  const points: [number, number][] = [[20, 90]]
  const run = 90 / Math.max(1, line.bends)
  let [x, y] = points[0] ?? [20, 90]
  for (let bend = 0; bend <= line.bends; bend += 1) {
    x += bend % 2 === 0 ? run : 12
    y += bend % 2 === 0 ? -(8 * (bend % 3)) : 22 - bend * 5
    points.push([x, y])
  }
  const path = points.map(([px, py]) => `${px},${py}`).join(' ')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="140"><rect width="260" height="140" fill="white"/><polyline points="${path}" fill="none" stroke="#111827" stroke-width="3"/><text x="130" y="130" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#6b7280">${line.product_id} · flat ${line.width}in</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
