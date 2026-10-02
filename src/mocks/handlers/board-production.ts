import { http, HttpResponse } from 'msw'
import { coilLots, serializeCoil } from '../lib/coils'
import {
  cutlists,
  createRemakeCutlists,
  rowComplete,
  type CutList,
  type CutRow
} from '../lib/cutlists'
import { now, workDay } from '../lib/dates'
import { bodyOf, nextId, notFound, paramsOf, refuse } from '../lib/http'
import {
  ensureSalesOrder,
  lineById,
  lines,
  nextCounter,
  orderById,
  orders,
  priorityOf,
  title
} from '../lib/world'
import { batches, cardOf, drawing, remans, stockCards, trimProduct, type Batch } from '../lib/stock'
import type { Line, Order } from '../lib/types'
import { api } from '../url'

const sourceOf = (line: Line, quantity: number) => {
  const order = orderById(line.order)
  return {
    order: line.order,
    order_number: order?.invoice ?? null,
    customer: order?.customer ?? null,
    po_number: order?.po_no ?? null,
    origin_item: line.id,
    quantity,
    item_id: line.item?.id ?? null,
    product_id: line.product_id,
    description: line.description,
    qty_ordered: line.quantity,
    pull_from_stock: line.item?.pull_from_stock ?? null,
    status: line.item?.status ?? null,
    is_stock: order?.is_stock ?? false,
    product_files: [
      { id: line.item?.id ?? 0, name: `${line.product_id} drawing`, url: drawing(line) }
    ]
  }
}

const rowOf = (list: CutList, row: CutRow) => ({
  id: row.id,
  width: row.width,
  length: row.length,
  machine: row.machine,
  vented: row.vented,
  quantity: row.quantity,
  complete: rowComplete(list, row),
  operator_notes: row.operator_notes,
  is_standard_length: row.length === 120,
  sources: row.shares.map(share => sourceOf(share.line, share.quantity))
})

const listOf = (list: CutList) => ({
  id: list.id,
  department: 1,
  kind: list.kind,
  machine: list.machine,
  production_date: list.production_date,
  gauge: list.gauge,
  color: list.color,
  gauge_color: `${list.gauge}ga ${title(list.color ?? '')}`,
  priority: priorityOf(list.priority),
  released_at: list.released_at,
  completed_at: list.completed_at,
  is_complete: list.is_complete,
  is_remanufacture: list.is_remanufacture,
  remanufacturing_id: list.remanufacturing_id,
  rows: list.rows.map(row => rowOf(list, row))
})

/** One step back along the line's way through the machines when a row is unticked. */
const STEP_BACK: Record<string, Record<string, string>> = {
  cutlist: { cut: 'not_started' },
  bendlist: { bent: 'cut' }
}

const setRow = (list: CutList, row: CutRow, complete: boolean) => {
  for (const { line } of row.shares) {
    const item = line.item
    if (!item) continue
    if (complete) {
      if (item.status === 'not_started' || (list.kind === 'bendlist' && item.status === 'cut')) {
        item.status = list.kind === 'cutlist' ? 'cut' : 'bent'
      }
    } else {
      item.status = STEP_BACK[list.kind]?.[item.status ?? ''] ?? item.status
    }
  }
}

let uploads = 5000

export const boardProductionHandlers = [
  http.get(api('cutlists/'), ({ request }) => {
    const params = paramsOf(request)
    const dept = Number(params.get('department_id'))
    const kind = params.get('kind')
    const done = params.get('completed') === 'true'
    const machine = params.get('machine')
    const rank = (list: CutList) => priorityOf(list.priority)?.position ?? 99
    return HttpResponse.json(
      dept !== 1
        ? []
        : cutlists
            .filter(
              list =>
                list.kind === kind &&
                list.is_complete === done &&
                (machine === null || list.machine === Number(machine))
            )
            .toSorted(
              (a, b) =>
                (a.production_date ?? '').localeCompare(b.production_date ?? '') ||
                rank(a) - rank(b) ||
                `${a.gauge}${a.color}`.localeCompare(`${b.gauge}${b.color}`)
            )
            .map(listOf)
    )
  }),

  http.patch(api('cutlists/rows/:id/'), async ({ params, request }) => {
    const id = Number(params.id)
    const list = cutlists.find(row => row.rows.some(r => r.id === id))
    const row = list?.rows.find(r => r.id === id)
    if (!list || !row) return notFound()
    const edit = await bodyOf<{ complete?: boolean; operator_notes?: string }>(request)
    if (typeof edit.complete === 'boolean') setRow(list, row, edit.complete)
    if (edit.operator_notes !== undefined) row.operator_notes = edit.operator_notes || null
    return HttpResponse.json(rowOf(list, row))
  }),

  http.post(api('cutlists/:id/done/'), ({ params }) => {
    const list = cutlists.find(row => row.id === Number(params.id))
    if (!list) return notFound()
    if (list.rows.some(row => !rowComplete(list, row))) {
      return refuse('Some rows are still outstanding.', 409)
    }
    list.is_complete = true
    list.completed_at = now()
    return HttpResponse.json(listOf(list))
  }),

  http.get(api('cutlists/:id/coils/'), ({ params }) => {
    const list = cutlists.find(row => row.id === Number(params.id))
    if (!list) return notFound()
    return HttpResponse.json(
      coilLots.filter(lot => lot.in_slinet && lot.color === list.color).map(serializeCoil)
    )
  }),

  http.get(api('remanufacturings/'), ({ request }) => {
    const dept = Number(paramsOf(request).get('department'))
    const results = remans.filter(row => row.department === dept)
    return HttpResponse.json({ count: results.length, results })
  }),

  http.post(api('remanufacturings/request/'), async ({ request }) => {
    const body = await bodyOf<{
      source: string
      order: string
      origin_item: string
      department: number
      quantity: number
      pull_from_stock_qty?: number
      note?: string
    }>(request)
    const line = lineById(body.origin_item)
    if (!line) return notFound()
    const reman = {
      id: nextId(remans),
      order: body.order,
      origin_item: body.origin_item,
      department: body.department,
      source: body.source,
      remanufacturing_qty: body.quantity,
      pull_from_stock_qty: body.pull_from_stock_qty ?? 0,
      note: body.note ?? null,
      is_cut: false,
      is_bent: false
    }
    remans.push(reman)
    if (line.dept === 1) createRemakeCutlists(line, body.quantity, reman.id)
    return HttpResponse.json(reman, { status: 201 })
  }),

  // --- Stock cards and stock orders ---------------------------------------------------------
  http.get(api('stock-cards/'), () => HttpResponse.json(stockCards.map(cardOf))),

  http.get(api('stock-cards/product/:productId/'), ({ params }) => {
    const productId = decodeURIComponent(String(params.productId))
    const line = trimProduct(productId)
    if (!line) return notFound()
    return HttpResponse.json({
      product_id: productId,
      description: line.description,
      color: line.color,
      gauge: line.gauge,
      width_from_orders: line.width,
      has_card: stockCards.some(card => card.product_id === productId)
    })
  }),

  http.post(api('files/models/'), () =>
    HttpResponse.json({ id: (uploads += 1), full_path: null }, { status: 201 })
  ),

  http.post(api('stock-cards/print/'), async ({ request }) => {
    const { card_ids } = await bodyOf<{ card_ids: number[] }>(request)
    return HttpResponse.json(
      stockCards
        .filter(card => card_ids.includes(card.id))
        .map(card => {
          const row = cardOf(card)
          return { ...row, qr: row.qr_payload }
        })
    )
  }),

  http.post(api('stock-cards/scan/'), async ({ request }) => {
    const { payload } = await bodyOf<{ payload: string }>(request)
    const card = stockCards.find(row => `STOCKCARD:${row.id}` === payload)
    if (!card) return refuse('This code is not a stock card.', 404)
    const row = cardOf(card)
    return HttpResponse.json({
      product_id: row.product_id,
      description: row.description,
      order_qty: row.order_qty
    })
  }),

  http.post(api('stock-cards/'), async ({ request }) => {
    const body = await bodyOf<{
      product_id: string
      stock_minimum: number
      order_qty: number
      image_id: number
      width: number | null
    }>(request)
    if (!trimProduct(body.product_id)) return refuse('EBMS does not know this product.', 404)
    if (stockCards.some(card => card.product_id === body.product_id)) {
      return refuse('This product already has a stock card.', 409)
    }
    const card = { ...body, id: nextId(stockCards) }
    stockCards.push(card)
    return HttpResponse.json(cardOf(card), { status: 201 })
  }),

  http.patch(api('stock-cards/:id/'), async ({ params, request }) => {
    const card = stockCards.find(row => row.id === Number(params.id))
    if (!card) return notFound()
    Object.assign(card, await request.json())
    return HttpResponse.json(cardOf(card))
  }),

  http.delete(api('stock-cards/:id/'), ({ params }) => {
    const at = stockCards.findIndex(row => row.id === Number(params.id))
    if (at !== -1) stockCards.splice(at, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(api('stock-orders/'), async ({ request }) => {
    const { lines: rows } = await bodyOf<{
      lines: { product_id: string; quantity: number; description?: string; length?: number }[]
    }>(request)
    const number = nextCounter('stockOrder')
    const id = `S${number}`
    const order: Order = {
      id,
      invoice: id,
      customer: 'Stock',
      ship_date: workDay(7),
      crea_date: workDay(0),
      ship_via: 'Stock',
      po_no: null,
      salesman: 'Dana Wells',
      address: '',
      city: '',
      state: 'OH',
      is_stock: true,
      sales_order_id: null,
      states: {}
    }
    orders.unshift(order)
    ensureSalesOrder(order)
    rows.forEach((row, index) => {
      const template = trimProduct(row.product_id)
      if (!template) return
      const length = row.length ?? template.length ?? 120
      lines.push({
        ...template,
        id: `LI${number}-${index + 1}`,
        order: id,
        quantity: row.quantity,
        shipped: 0,
        length,
        unit_weight:
          Math.round(template.unit_weight * (length / (template.length ?? 120)) * 100) / 100,
        description: row.description ?? template.description,
        item: null
      })
    })
    return HttpResponse.json({ order: id }, { status: 201 })
  }),

  http.get(api('departments/:id/manufacturing-batches/'), () =>
    HttpResponse.json(
      batches
        .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
        .map(batch => ({
          ...batch,
          lines: batch.lines.map(row => ({
            ...row,
            description: trimProduct(row.product_id)?.description ?? null
          }))
        }))
    )
  ),

  http.post(api('departments/:id/stock-manufacturing/'), async ({ request }) => {
    const { lines: rows } = await bodyOf<{ lines: { quantity: number; product_id: string }[] }>(
      request
    )
    const batch: Batch = {
      id: nextId(batches),
      order: null,
      ebms_batch: `MB-${20440 + batches.length}`,
      created_at: now(),
      lines: rows.map(row => ({ ...row, origin_item: null }))
    }
    batches.push(batch)
    return HttpResponse.json(
      {
        ...batch,
        lines: batch.lines.map(row => ({
          ...row,
          description: trimProduct(row.product_id)?.description ?? null
        }))
      },
      { status: 201 }
    )
  })
]
