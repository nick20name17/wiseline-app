import { http, HttpResponse } from 'msw'
import { coilLots } from '../lib/coils'
import { now, today } from '../lib/dates'
import { bodyOf, notFound, paramsOf, refuse } from '../lib/http'
import { lineById, lines, needOf, orderById, priorityOf, wrappedOf } from '../lib/world'
import type { Line } from '../lib/types'
import { api } from '../url'

// Lines with nothing left to roll (stages/rollforming_queue.py).
const DONE = ['rolled', 'wrapped', 'shipped', 'stock']

// What the coil columns read while a line waits on the Slit Line.
const WAITING = 'waiting...'

const isWaiting = (line: Line) => line.item?.coil_icon === 'waiting_to_slit'

const display = (line: Line) => ({
  supplier: isWaiting(line) ? WAITING : (line.item?.supplier ?? 'Undefined'),
  coil_number: isWaiting(line) ? WAITING : (line.item?.coil_number ?? 'Undefined')
})

const machineOf = (line: Line) => line.item?.flow ?? line.machine_id

/** The coil product a line is rolled from: one of its colour and gauge. */
const materialOf = (line: Line) =>
  coilLots.find(lot => lot.color === line.color && String(lot.gauge) === line.gauge)?.product_id ??
  null

const leftToRoll = (line: Line) => Math.max(0, needOf(line) - wrappedOf(line))

type QueueRow = {
  key: string
  production_date: string
  material_id: string | null
  material: string
  profile: string | null
  linear_feet: number
  weight: number
  priority: { id: number; name: string } | null
  supplier: string
  coil_number: string
  coil_icon: string | null
  coil_fields_locked: boolean
  gauge: string | null
  color: string | null
  current: boolean
  is_overdue: boolean
  lines: object[]
  sort: string
}

/** Where the Manager dragged each row, by key, within its day. */
const dragged = new Map<string, number>()

type CurrentCoil = {
  key: string | null
  supplier: string
  coil_number: string
  material_id: string | null
  gauge: string | null
  color: string | null
  set_at: string
}

const currentCoils = new Map<number, CurrentCoil>()

const queueRows = (flowId: number) => {
  const groups = new Map<string, QueueRow>()
  for (const line of lines) {
    const item = line.item
    if (line.dept !== 2 || !item?.is_released || !item.production_date) continue
    if (machineOf(line) !== flowId || DONE.includes(item.status ?? '')) continue
    const left = leftToRoll(line)
    if (left <= 0) continue
    const order = orderById(line.order)
    const priority = priorityOf(order?.states[2]?.priority)
    const material = materialOf(line)
    const key = [
      item.production_date,
      material,
      line.profile,
      priority?.id,
      item.supplier,
      item.coil_number,
      item.coil_icon
    ].join('|')
    const shown = display(line)
    const row = groups.get(key) ?? {
      key,
      production_date: item.production_date,
      material_id: material,
      material: `${line.gauge}Ga. ${line.color ?? ''}`.trim(),
      profile: line.profile,
      linear_feet: 0,
      weight: 0,
      priority: priority ? { id: priority.id, name: priority.name } : null,
      ...shown,
      coil_icon: item.coil_icon,
      coil_fields_locked: item.coil_fields_locked,
      gauge: line.gauge,
      color: line.color,
      current: false,
      is_overdue: item.production_date < today(),
      lines: [],
      sort: `${material}|${line.profile}|${priority?.position ?? 99}|${item.supplier ?? ''}|${item.coil_number ?? ''}`
    }
    row.linear_feet += (left * (line.length ?? 0)) / 12
    row.weight += left * line.unit_weight
    row.lines.push({
      item_id: item.id,
      origin_item: line.id,
      order: line.order,
      order_number: order?.is_stock ? order.id : (order?.invoice ?? null),
      product_id: line.product_id,
      quantity: left,
      length: line.length,
      status: item.status
    })
    groups.set(key, row)
  }
  const coil = currentCoils.get(flowId)
  return [...groups.values()]
    .toSorted(
      (a, b) =>
        a.production_date.localeCompare(b.production_date) ||
        (dragged.get(a.key) ?? Infinity) - (dragged.get(b.key) ?? Infinity) ||
        a.sort.localeCompare(b.sort)
    )
    .map(({ sort: _sort, ...row }, position, rows) => ({
      ...row,
      position,
      linear_feet: Math.round(row.linear_feet * 100) / 100,
      weight: Math.round(row.weight * 100) / 100,
      starts_day_group:
        position === 0 || rows[position - 1]?.production_date !== row.production_date,
      current: !!coil && row.supplier === coil.supplier && row.coil_number === coil.coil_number
    }))
}

const putCoilIn = (flowId: number, key: string) => {
  const row = queueRows(flowId).find(candidate => candidate.key === key)
  if (!row) return 'No such row in this machine’s Queue.'
  if (row.coil_fields_locked || row.supplier === 'Undefined' || row.coil_number === 'Undefined') {
    return 'This row has no Supplier and Coil Number yet, so there is no coil to put in the machine.'
  }
  currentCoils.set(flowId, {
    key,
    supplier: row.supplier,
    coil_number: row.coil_number,
    material_id: row.material_id,
    gauge: row.gauge,
    color: row.color,
    set_at: now()
  })
  return null
}

// Each machine starts the day with the first coil its queue names.
for (const flowId of new Set(lines.filter(line => line.dept === 2).map(machineOf))) {
  if (flowId === null) continue
  const first = queueRows(flowId).find(
    row => row.supplier !== 'Undefined' && !row.coil_fields_locked
  )
  if (first) putCoilIn(flowId, first.key)
}

const slitLine = (line: Line) => {
  const order = orderById(line.order)
  return {
    origin_item: line.id,
    order: line.order,
    invoice: order?.is_stock ? order.id : (order?.invoice ?? null),
    product_id: line.product_id,
    description: line.description,
    quantity: line.quantity,
    production_date: line.item?.production_date ?? null,
    icon: line.item?.coil_icon ?? null,
    locked: !!line.item?.coil_fields_locked,
    ...display(line)
  }
}

const itemsOf = (ids: string[]) =>
  ids.flatMap(id => {
    const line = lineById(id)
    return line?.item ? [line] : []
  })

/** Coils of the line's colour and gauge, grouped by the coil product. */
const coilChoices = (line: Line) =>
  coilLots.filter(lot => lot.color === line.color && String(lot.gauge) === line.gauge)

export const rollformingHandlers = [
  http.get(api('rollforming/queue/'), ({ request }) =>
    HttpResponse.json(queueRows(Number(paramsOf(request).get('flow_id'))))
  ),

  http.post(api('rollforming/queue/reorder/'), async ({ request }) => {
    const body = await bodyOf<{ flow_id: number; production_date: string; keys: string[] }>(request)
    const day = queueRows(body.flow_id).filter(row => row.production_date === body.production_date)
    const known = new Set(day.map(row => row.key))
    if (
      new Set(body.keys).size !== body.keys.length ||
      body.keys.some(key => !known.has(key)) ||
      body.keys.length !== known.size
    ) {
      return refuse('List every Queue row of that Production Date, once each.')
    }
    body.keys.forEach((key, position) => dragged.set(key, position))
    return HttpResponse.json(
      queueRows(body.flow_id).filter(row => row.production_date === body.production_date)
    )
  }),

  http.get(api('rollforming/machines/:flow/current-coil/'), ({ params }) =>
    HttpResponse.json(currentCoils.get(Number(params.flow)) ?? null)
  ),

  http.post(api('rollforming/machines/:flow/current-coil/'), async ({ params, request }) => {
    const flowId = Number(params.flow)
    const { key } = await bodyOf<{ key: string }>(request)
    const refusal = putCoilIn(flowId, key)
    if (refusal) return refuse(refusal)
    return HttpResponse.json(currentCoils.get(flowId))
  }),

  http.delete(api('rollforming/machines/:flow/current-coil/'), ({ params }) => {
    currentCoils.delete(Number(params.flow))
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(api('slit-line/'), ({ request }) => {
    const slit = paramsOf(request).get('slit') === 'true'
    const rank = (line: Line) =>
      priorityOf(orderById(line.order)?.states[2]?.priority)?.position ?? 99
    return HttpResponse.json(
      lines
        .filter(
          line => line.dept === 2 && line.item?.coil_icon === (slit ? 'slit' : 'waiting_to_slit')
        )
        .toSorted(
          (a, b) =>
            (a.item?.production_date ?? '').localeCompare(b.item?.production_date ?? '') ||
            rank(a) - rank(b) ||
            a.id.localeCompare(b.id)
        )
        .map(slitLine)
    )
  }),

  http.post(api('slit-line/request/'), async ({ request }) => {
    const { origin_items } = await bodyOf<{ origin_items: string[] }>(request)
    const found = itemsOf(origin_items)
    const fromStock = found.find(line => line.item?.status === 'stock')
    if (fromStock)
      return refuse(`Line item ${fromStock.id} comes from stock, so it has nothing to slit.`)
    for (const line of found) {
      const item = line.item!
      if (item.coil_icon === 'slit') continue
      item.coil_icon = 'waiting_to_slit'
      item.coil_fields_locked = true
      item.supplier = null
      item.coil_number = null
    }
    return HttpResponse.json(found.map(slitLine))
  }),

  http.post(api('slit-line/cancel/'), async ({ request }) => {
    const { origin_items } = await bodyOf<{ origin_items: string[] }>(request)
    const found = itemsOf(origin_items)
    const slit = found.find(line => line.item?.coil_icon === 'slit')
    if (slit) return refuse(`Line item ${slit.id} has already been slit.`)
    for (const line of found) {
      line.item!.coil_icon = null
      line.item!.coil_fields_locked = false
    }
    return HttpResponse.json(found.map(slitLine))
  }),

  http.post(api('slit-line/mark-slit/'), async ({ request }) => {
    const body = await bodyOf<{
      origin_items: string[]
      supplier: string | null
      coil_number: string | null
    }>(request)
    const found = itemsOf(body.origin_items)
    const unsent = found.find(line => !isWaiting(line))
    if (unsent) return refuse(`Line item ${unsent.id} was not sent to the Slit Line.`)
    for (const line of found) {
      const item = line.item!
      item.coil_icon = 'slit'
      item.coil_fields_locked = false
      item.supplier = body.supplier
      item.coil_number = body.coil_number
    }
    return HttpResponse.json(found.map(slitLine))
  }),

  http.get(api('coil-assignment/:originItem/coils/'), ({ params }) => {
    const line = lineById(String(params.originItem))
    if (!line) return notFound()
    const byProduct = new Map<
      string,
      { product_id: string; description: string; width: number; linear_feet: number }
    >()
    for (const lot of coilChoices(line)) {
      const row = byProduct.get(lot.product_id) ?? {
        product_id: lot.product_id,
        description: `${lot.gauge}Ga. ${lot.color} ${lot.width}" coil`,
        width: lot.width,
        linear_feet: 0
      }
      row.linear_feet += lot.linear_feet
      byProduct.set(lot.product_id, row)
    }
    return HttpResponse.json([...byProduct.values()])
  }),

  http.get(api('coil-assignment/:originItem/suppliers/'), ({ params }) => {
    const line = lineById(String(params.originItem))
    if (!line) return notFound()
    return HttpResponse.json(
      [...new Set(coilChoices(line).map(lot => lot.supplier))].map(supplier => ({ supplier }))
    )
  }),

  http.get(api('coil-assignment/coils/:productId/lots/'), ({ params }) =>
    HttpResponse.json(
      coilLots
        .filter(lot => lot.product_id === decodeURIComponent(String(params.productId)))
        .map(lot => ({ coil_number: lot.lot_number, on_hand: lot.linear_feet }))
    )
  ),

  // Both left out is Undefined — any coil will do; a Coil Number needs a Supplier.
  http.post(api('coil-assignment/assign/'), async ({ request }) => {
    const body = await bodyOf<{
      origin_items: string[]
      supplier: string | null
      coil_number: string | null
    }>(request)
    if (body.coil_number && !body.supplier) return refuse('A Coil Number needs a Supplier.')
    const found = itemsOf(body.origin_items)
    const locked = found.find(line => line.item?.coil_fields_locked)
    if (locked) return refuse(`Line item ${locked.id} is waiting on the Slit Line.`)
    for (const line of found) {
      const item = line.item!
      item.supplier = body.supplier
      item.coil_number = body.coil_number
      if (item.coil_icon !== 'slit') item.coil_icon = body.supplier ? 'coil' : null
    }
    return HttpResponse.json(found.map(slitLine))
  })
]
