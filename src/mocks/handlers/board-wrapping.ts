import { http, HttpResponse } from 'msw'
import { now } from '../lib/dates'
import { bodyOf, nextId, notFound, paged, paramsOf, refuse } from '../lib/http'
import {
  addPackage,
  deletedPackages,
  deptStatus,
  firstDay,
  isDone,
  lineById,
  lineNotes,
  linesOfOrder,
  locationById,
  maxPackageWeight,
  needOf,
  onBench,
  orderById,
  orders,
  packages,
  packagesOn,
  packLocations,
  priorityOf,
  removePackage,
  round2,
  usedWeight,
  wrappedOf
} from '../lib/world'
import { locationCodes } from '../lib/serialize'
import { assignments, truckById } from '../lib/shipping'
import { batches } from '../lib/stock'
import type { Dept, Line, Order, Pkg } from '../lib/types'
import { warehouses } from '../seed/warehouses'
import type { SeedLocation } from '../seed/locations'
import { api } from '../url'

// What a line must be before it can be packed, per department (stages/accessories.py).
const READY: Record<Dept, string[]> = {
  1: ['bent', 'stock', 'bypassed'],
  2: ['not_started', 'in_progress', 'rolled', 'stock'],
  3: ['not_started', 'in_progress', 'stock']
}

const isReady = (line: Line) => READY[line.dept].includes(line.item?.status ?? '')

/** Rollforming only: a line packs once it says which coil it ran off, unless it came from stock. */
const coilMissing = (line: Line) =>
  line.dept === 2 &&
  line.item?.status !== 'stock' &&
  !(line.item?.supplier?.trim() && line.item.coil_number?.trim())

const leftOf = (line: Line) => Math.max(0, needOf(line) - wrappedOf(line))

const orderNumber = (order: Order) => (order.is_stock ? order.id : order.invoice)

const priorityName = (order: Order, dept: Dept) =>
  priorityOf(order.states[dept]?.priority)?.name ?? null

const serializePackage = (pkg: Pkg) => ({
  package_id: pkg.package_id,
  name: pkg.name,
  weight: pkg.weight,
  location: locationById(pkg.location_id)?.code ?? null,
  is_loaded: pkg.is_loaded,
  contents: pkg.contents
})

/** The bench: every released line of an order the department has not completed. */
const benchLines = (dept: Dept, day: string | null) =>
  orders.flatMap(order => {
    if (isDone(order, dept)) return []
    return linesOfOrder(order, dept)
      .filter(line => onBench(line) && (!day || line.item?.production_date === day))
      .map(line => ({ order, line }))
  })

const wrappingRow = (order: Order, line: Line) => {
  const wrapped = wrappedOf(line)
  const left = Math.max(0, needOf(line) - wrapped)
  const ready = isReady(line) && !coilMissing(line)
  return {
    item_id: line.item?.id ?? null,
    origin_item: line.id,
    order: order.id,
    order_number: orderNumber(order),
    product_id: line.product_id,
    customer: order.is_stock ? 'Stock' : order.customer,
    description: line.description,
    production_date: line.item?.production_date ?? null,
    priority: priorityName(order, line.dept),
    status: line.item?.status ?? null,
    is_bypassed: !!line.item?.bypassed,
    qty_ordered: line.quantity,
    from_stock: line.item?.pull_from_stock ?? 0,
    wrapped,
    left_to_wrap: left,
    can_wrap: ready && left > 0,
    coil_missing: coilMissing(line),
    auto_fill_available: ready && left > 0,
    auto_fill_amount: left,
    is_stock: order.is_stock,
    length: line.length,
    is_standard_length: line.length === 120,
    unit_weight: line.unit_weight,
    po: order.po_no,
    salesman: order.is_stock ? null : order.salesman,
    ship_via: order.is_stock ? null : order.ship_via,
    ship_date: order.is_stock ? null : order.ship_date
  }
}

const warehouseOf = (id: number) => warehouses.find(row => row.id === id)

const ordersOnIt = (locationId: number) =>
  new Set(packagesOn(locationId).map(pkg => pkg.order)).size

const slotOf = (location: SeedLocation) => {
  const used = usedWeight(location.id)
  const limit = location.multi_order ? (location.max_orders ?? 1) : 1
  return {
    location_id: location.id,
    name: location.code,
    warehouse: warehouseOf(location.warehouse_id)?.name ?? null,
    max_weight: location.weight,
    used_weight: used,
    orders_on_it: ordersOnIt(location.id),
    multi_order: location.multi_order,
    max_orders: location.max_orders,
    available: ordersOnIt(location.id) < limit,
    remaining_weight: round2(location.weight - used),
    warehouse_is_default: !!warehouseOf(location.warehouse_id)?.is_default
  }
}

/** Refused as the bench refuses it: a location full with other orders (stages/location_rules.py). */
const roomFor = (locationId: number, order: string) => {
  const location = locationById(locationId)
  if (!location) return 'Location not found'
  const others = new Set(
    packagesOn(locationId)
      .map(pkg => pkg.order)
      .filter(id => id !== order)
  )
  const limit = location.multi_order ? (location.max_orders ?? 1) : 1
  return others.size + 1 > limit
    ? `Location ${location.code} is already taken by another order.`
    : null
}

const orderLocations = (order: string) => {
  const mine = packages.filter(pkg => pkg.order === order && pkg.location_id !== null)
  const ids = [...new Set(mine.map(pkg => pkg.location_id as number))]
  return ids.map((id, index) => {
    const here = mine.filter(pkg => pkg.location_id === id)
    return {
      location_id: id,
      name: locationById(id)?.code ?? null,
      max_weight: locationById(id)?.weight ?? null,
      packages: here.length,
      weight_on_it: round2(here.reduce((total, pkg) => total + pkg.weight, 0)),
      // Only the newest location still takes packages.
      orange: index !== ids.length - 1,
      current: index === ids.length - 1
    }
  })
}

// The Truck column comes from Dispatch: the order's shipping assignment.
const truckOf = (order: Order) => {
  if (order.ship_via.toLowerCase().startsWith('pickup')) return 'N/A'
  const row = assignments.find(assignment => assignment.order === order.id)
  return row ? (truckById(row.truck_id)?.name ?? null) : null
}

// --- Stock orders at the bench --------------------------------------------------------------

/** What the floor typed into a stock row's Wrapped keypad, until its batch goes to EBMS. */
const stockWrapped = new Map<string, number>()

const batchedQty = (originItem: string) =>
  batches
    .flatMap(batch => batch.lines)
    .filter(row => row.origin_item === originItem)
    .reduce((total, row) => total + row.quantity, 0)

const stockRow = (line: Line) => {
  const manufactured = batchedQty(line.id) > 0
  const wrapped = stockWrapped.get(line.id) ?? 0
  return {
    origin_item: line.id,
    product_id: line.product_id,
    description: line.description,
    length: line.length,
    is_standard_length: line.length === 120,
    qty_ordered: line.quantity,
    left_to_wrap: manufactured ? null : Math.max(0, line.quantity - wrapped),
    wrapped: manufactured ? null : wrapped,
    qty_manufactured: manufactured ? batchedQty(line.id) : null,
    manufactured,
    status: line.item?.status ?? null,
    can_wrap: !manufactured && isReady(line),
    can_select: !manufactured && wrapped > 0
  }
}

// --- Completed orders -----------------------------------------------------------------------

const manufacturedOf = (order: Order, line: Line) =>
  order.is_stock ? batchedQty(line.id) : needOf(line)

const completedDetail = (order: Order, dept: Dept) => ({
  order: order.id,
  order_number: orderNumber(order),
  is_stock: order.is_stock,
  customer: order.is_stock ? 'Stock' : order.customer,
  po: order.is_stock ? null : order.po_no,
  salesman: order.is_stock ? null : order.salesman,
  ship_via: order.is_stock ? null : order.ship_via,
  ship_date: order.is_stock ? null : order.ship_date,
  production_date: firstDay(order, dept),
  priority: priorityName(order, dept),
  trim_location: locationCodes(order, dept),
  completed_at: order.states[dept]?.completed_at ?? null,
  line_items: linesOfOrder(order, dept).map(line => ({
    origin_item: line.id,
    product_id: line.product_id,
    description: line.description,
    qty_ordered: line.quantity,
    from_stock: line.item?.pull_from_stock ?? 0,
    manufactured: manufacturedOf(order, line),
    length: line.length,
    notes: lineNotes.filter(note => note.item === line.id).map(note => note.text),
    packaged: wrappedOf(line),
    status: line.item?.status ?? null
  })),
  packages: packages
    .filter(pkg => pkg.order === order.id && pkg.department === dept)
    .map(serializePackage)
})

const outstandingOf = (order: Order, dept: Dept) =>
  linesOfOrder(order, dept)
    .map(line => ({ origin_item: line.id, left: leftOf(line) }))
    .filter(row => row.left > 0)

const batchOf = (order: Order, dept: Dept) =>
  linesOfOrder(order, dept).map(line => ({
    origin_item: line.id,
    qty_ordered: line.quantity,
    from_stock: line.item?.pull_from_stock ?? 0,
    manufactured: needOf(line)
  }))

const deptParam = (request: Request) => Number(paramsOf(request).get('department_id')) as Dept

export const boardWrappingHandlers = [
  http.get(api('wrapping/'), ({ request }) => {
    const dept = deptParam(request)
    const day = paramsOf(request).get('production_date')
    const rank = (order: Order) => priorityOf(order.states[dept]?.priority)?.position ?? 99
    return HttpResponse.json(
      benchLines(dept, day)
        .toSorted(
          (a, b) =>
            (a.line.item?.production_date ?? '').localeCompare(
              b.line.item?.production_date ?? ''
            ) ||
            rank(a.order) - rank(b.order) ||
            a.line.product_id.localeCompare(b.line.product_id)
        )
        .map(({ order, line }) => wrappingRow(order, line))
    )
  }),

  http.get(api('departments/:id/packaging/'), ({ params }) => {
    const dept = Number(params.id) as Dept
    const rank = (order: Order) => priorityOf(order.states[dept]?.priority)?.position ?? 99
    const rows = orders
      .filter(order => order.states[dept] && linesOfOrder(order, dept).some(l => l.item))
      .toSorted(
        (a, b) =>
          (firstDay(a, dept) ?? '').localeCompare(firstDay(b, dept) ?? '') ||
          rank(a) - rank(b) ||
          a.invoice.localeCompare(b.invoice)
      )
    return HttpResponse.json(
      rows.map((order, index) => ({
        order: order.id,
        order_number: orderNumber(order),
        customer: order.is_stock ? 'Stock' : order.customer,
        prep_date: firstDay(order, dept),
        priority: priorityName(order, dept),
        truck: truckOf(order),
        ship_via: order.ship_via,
        status: deptStatus(order, dept),
        starts_day_group:
          index === 0 || firstDay(rows[index - 1] as Order, dept) !== firstDay(order, dept)
      }))
    )
  }),

  http.get(api('wrapping/locations/'), ({ request }) =>
    HttpResponse.json(packLocations(deptParam(request)).map(slotOf))
  ),

  http.get(api('wrapping/orders/:order/locations/'), ({ params }) =>
    HttpResponse.json(orderLocations(String(params.order)))
  ),

  http.post(api('wrapping/orders/:order/locations/'), async ({ params, request }) => {
    const order = String(params.order)
    const body = await bodyOf<{ location_id: number; package_ids?: number[] }>(request)
    const refusal = roomFor(body.location_id, order)
    if (refusal) return refuse(refusal)
    const moving = packages.filter(
      pkg =>
        pkg.order === order &&
        !pkg.is_loaded &&
        (!body.package_ids || body.package_ids.includes(pkg.package_id))
    )
    for (const pkg of moving) pkg.location_id = body.location_id
    return HttpResponse.json({
      moved_to: body.location_id,
      packages_moved: moving.length,
      locations: orderLocations(order)
    })
  }),

  // Its packages go to the order's newest other location, or stand nowhere if there is none.
  http.delete(api('wrapping/orders/:order/locations/:location/'), ({ params }) => {
    const order = String(params.order)
    const removed = Number(params.location)
    const target =
      orderLocations(order)
        .filter(row => row.location_id !== removed)
        .at(-1)?.location_id ?? null
    const moving = packages.filter(pkg => pkg.order === order && pkg.location_id === removed)
    for (const pkg of moving) pkg.location_id = target
    return HttpResponse.json({
      removed,
      moved_to: target,
      packages_moved: moving.length,
      locations: orderLocations(order)
    })
  }),

  http.get(api('wrapping/orders/:order/packages/'), ({ params }) =>
    HttpResponse.json(
      packages.filter(pkg => pkg.order === String(params.order)).map(serializePackage)
    )
  ),

  http.post(api('wrapping/packages/'), async ({ request }) => {
    const body = await bodyOf<{
      order: string
      department_id: number
      location_id: number
      lines: { origin_item: string; quantity: number }[]
      weight?: number
      override_weight?: boolean
    }>(request)
    const dept = body.department_id as Dept
    const order = orderById(body.order)
    if (!order) return notFound()
    if (!body.lines.length) return refuse('Nothing to wrap.')
    const refusal = roomFor(body.location_id, order.id)
    if (refusal) return refuse(refusal)
    const parts: { line: Line; quantity: number }[] = []
    for (const row of body.lines) {
      const line = lineById(row.origin_item)
      if (!line) return refuse(`Line item ${row.origin_item} not found`, 404)
      if (!isReady(line)) return refuse(`Line item ${row.origin_item} is not ready to wrap yet.`)
      if (coilMissing(line)) {
        return refuse(
          `Line item ${row.origin_item} needs a Supplier and Coil Number before it is packaged.`
        )
      }
      const left = leftOf(line)
      if (!(row.quantity > 0 && row.quantity <= left)) {
        return refuse(`Line item ${row.origin_item}: wrap between 1 and ${left}.`)
      }
      parts.push({ line, quantity: row.quantity })
    }
    const weight =
      body.weight ?? round2(parts.reduce((t, p) => t + p.line.unit_weight * p.quantity, 0))
    if (!body.override_weight) {
      const reasons: string[] = []
      const limit = maxPackageWeight(dept)
      if (limit !== null && weight > limit) {
        reasons.push(`This package is over the Max Weight per package (${weight} > ${limit} lb).`)
      }
      const location = locationById(body.location_id)
      const used = usedWeight(body.location_id)
      if (location && used + weight > location.weight) {
        reasons.push(
          `This package would put ${location.code} over its Max Weight (${used} + ${weight} > ${location.weight}).`
        )
      }
      if (reasons.length) {
        return refuse(`${reasons.join(' ')} Confirm the override to create it anyway.`, 409)
      }
    }
    const pkg = addPackage(order, dept, parts, body.location_id, weight)
    return HttpResponse.json(serializePackage(pkg), { status: 201 })
  }),

  http.delete(api('wrapping/packages/:id/'), ({ params }) => {
    const pkg = removePackage(Number(params.id))
    if (!pkg) return notFound()
    return HttpResponse.json({ deleted: pkg.name })
  }),

  http.get(api('wrapping/packages/scan/:name/'), ({ params }) => {
    const name = decodeURIComponent(String(params.name))
    if (packages.some(pkg => pkg.name === name))
      return HttpResponse.json({ name, status: 'ok', detail: null })
    if (deletedPackages.has(name)) {
      return HttpResponse.json({
        name,
        status: 'deleted',
        detail: 'This package has been deleted.'
      })
    }
    return HttpResponse.json({ name, status: 'unknown', detail: 'No such package.' })
  }),

  http.get(api('wrapping/orders/:order/complete/'), ({ params, request }) => {
    const order = orderById(String(params.order))
    if (!order) return notFound()
    const dept = deptParam(request)
    const outstanding = outstandingOf(order, dept)
    return HttpResponse.json({
      can_complete: !outstanding.length && !order.is_stock,
      is_stock: order.is_stock,
      outstanding,
      manufacturing_batch: batchOf(order, dept)
    })
  }),

  http.post(api('wrapping/orders/:order/complete/'), ({ params, request }) => {
    const order = orderById(String(params.order))
    const dept = deptParam(request)
    const state = order?.states[dept]
    if (!order || !state) return notFound()
    if (outstandingOf(order, dept).length) return refuse('Something is still left to wrap.')
    state.completed_at ??= now()
    return HttpResponse.json({
      order: order.id,
      department_id: dept,
      manufactured: batchOf(order, dept),
      pushed: true
    })
  }),

  http.get(api('wrapping/stock-orders/:order/'), ({ params, request }) => {
    const order = orderById(String(params.order))
    if (!order) return notFound()
    return HttpResponse.json(linesOfOrder(order, deptParam(request)).map(stockRow))
  }),

  http.patch(api('wrapping/stock-orders/:order/lines/:line/'), async ({ params, request }) => {
    const line = lineById(String(params.line))
    if (!line) return notFound()
    const { wrapped } = await bodyOf<{ wrapped: number }>(request)
    if (wrapped < 0 || wrapped > line.quantity)
      return refuse(`Wrap between 0 and ${line.quantity}.`)
    stockWrapped.set(line.id, wrapped)
    return HttpResponse.json(stockRow(line))
  }),

  http.post(
    api('wrapping/stock-orders/:order/manufacturing-batch/'),
    async ({ params, request }) => {
      const order = orderById(String(params.order))
      if (!order) return notFound()
      const body = await bodyOf<{ department: number; origin_items: string[] }>(request)
      const dept = body.department as Dept
      const rows = body.origin_items.flatMap(id => {
        const quantity = stockWrapped.get(id) ?? 0
        const line = lineById(id)
        return line && quantity > 0 ? [{ line, quantity }] : []
      })
      if (!rows.length) return refuse('Enter what was wrapped first.')
      batches.push({
        id: nextId(batches),
        order: order.id,
        ebms_batch: `MB-${20440 + batches.length}`,
        created_at: now(),
        lines: rows.map(({ line, quantity }) => ({
          product_id: line.product_id,
          quantity,
          origin_item: line.id
        }))
      })
      for (const { line } of rows) {
        stockWrapped.delete(line.id)
        if (line.item) line.item.status = 'wrapped'
      }
      const completed = linesOfOrder(order, dept).every(line => batchedQty(line.id) > 0)
      const state = order.states[dept]
      if (completed && state) state.completed_at = now()
      return HttpResponse.json({ completed })
    }
  ),

  http.post(api('packages/:id/reprint/'), ({ params }) => {
    const pkg = packages.find(row => row.package_id === Number(params.id))
    if (!pkg) return notFound()
    return HttpResponse.json({ ...serializePackage(pkg), reprinted_at: now() })
  }),

  http.get(api('departments/:id/completed-orders/'), ({ params, request }) => {
    const dept = Number(params.id) as Dept
    const done = orders
      .filter(order => order.states[dept]?.completed_at)
      .toSorted((a, b) =>
        (b.states[dept]?.completed_at ?? '').localeCompare(a.states[dept]?.completed_at ?? '')
      )
      .map(order => ({
        order: order.id,
        order_number: orderNumber(order),
        customer: order.is_stock ? 'Stock' : order.customer,
        is_stock: order.is_stock,
        completed_at: order.states[dept]?.completed_at ?? null,
        production_date: firstDay(order, dept),
        ship_date: order.is_stock ? null : order.ship_date,
        trim_location: locationCodes(order, dept)
      }))
    return HttpResponse.json({ ...paged(request, done), window_days: 90 })
  }),

  http.get(api('departments/:id/completed-orders/:order/'), ({ params }) => {
    const order = orderById(String(params.order))
    const dept = Number(params.id) as Dept
    if (!order?.states[dept]) return notFound()
    return HttpResponse.json(completedDetail(order, dept))
  })
]
