import { http, HttpResponse } from 'msw'
import { bodyOf, paged, paramsOf, refuse } from '../lib/http'
import {
  assignments,
  buildRoute,
  DRIVER_OWNED,
  freeLeftLocations,
  isReleased,
  loadById,
  loads,
  loadsOf,
  longestOfOrder,
  nextId,
  onLoad,
  packagesOf,
  recalculate,
  stopsOf,
  totalWeight,
  truckById,
  weightOf,
  weightOfOrder,
  type Assignment,
  type Load,
  type LoadStatus
} from '../lib/shipping'
import { orderById, orders, round2 } from '../lib/world'
import { orderPlans } from '../seed/orders'
import { trucks } from '../seed/trucks'
import { api } from '../url'

type SelectionBody = { orders?: string[]; pickup_ids?: number[] }

/** Python's repr of an id list, which the server's refusals quote. */
const listed = (ids: number[]) => `[${ids.toSorted((a, b) => a - b).join(', ')}]`

const gone = new Set(orderPlans.filter(plan => plan.gone).map(plan => String(plan.no)))

const byName = () => trucks.toSorted((a, b) => a.name.localeCompare(b.name) || a.id - b.id)

const factsOf = (id: string) => {
  const order = orderById(id)
  if (!order) return null
  return {
    order: order.id,
    order_number: order.invoice,
    customer: order.customer,
    address: order.address,
    city: order.city,
    entry_date: order.crea_date,
    ship_date: order.ship_date,
    weight: weightOfOrder(order),
    longest_length: longestOfOrder(order),
    ship_via: 'Delivery'
  }
}

const assignmentRow = (row: Assignment) => {
  const order = row.order ? orderById(row.order) : undefined
  return {
    assignment_id: row.id,
    order: row.order,
    order_number: order?.invoice ?? row.supplier,
    customer: order?.customer ?? row.supplier,
    kind: row.kind,
    weight: weightOf(row),
    status: row.status
  }
}

const selectionTotals = ({ orders: ids = [], pickup_ids = [] }: SelectionBody) => {
  const facts = ids.flatMap(id => factsOf(id) ?? [])
  const pickups = assignments.filter(row => row.kind === 'pickup' && pickup_ids.includes(row.id))
  const delivery = {
    count: facts.length,
    total_weight: round2(facts.reduce((total, fact) => total + fact.weight, 0)),
    longest_length: Math.max(0, ...facts.map(fact => fact.longest_length))
  }
  const pickup = {
    count: pickups.length,
    total_weight: totalWeight(pickups),
    longest_length: Math.max(0, ...pickups.map(row => row.pickup_length ?? 0))
  }
  return { delivery, pickup, total_weight: round2(delivery.total_weight + pickup.total_weight) }
}

const tabOf = (load: Load) => {
  const mine = onLoad(load.id)
  return {
    load_id: load.id,
    name: `Load ${load.position}`,
    marker: `L-${load.position}`,
    position: load.position,
    status: load.status,
    weight: totalWeight(mine),
    orders: mine.map(assignmentRow),
    is_empty: !mine.length
  }
}

const emptyTab = (position: number) => ({
  load_id: null,
  name: `Load ${position}`,
  marker: `L-${position}`,
  position,
  status: null,
  weight: 0,
  orders: [],
  is_empty: true
})

const stopRows = (loadId: number) => {
  let sequence = 0
  return stopsOf(loadId).map(stop => ({
    route_id: stop.id,
    // The warehouse is where the run starts, so the first customer is stop 1.
    sequence: stop.dispatch_point ? null : ++sequence,
    dispatch_point: stop.dispatch_point,
    order: stop.order,
    order_number: stop.order ? (orderById(stop.order)?.invoice ?? null) : null,
    name: stop.name,
    address: stop.address,
    city: stop.city,
    state: stop.state,
    zip: null,
    country: null,
    position: stop.position
  }))
}

const STATUSES: LoadStatus[] = [
  'unreleased',
  'not_started',
  'loading',
  'loaded',
  'en_route',
  'delivered',
  'completed'
]

export const shippingHandlers = [
  // Delivery orders only, not yet on a truck: a customer pickup never reaches Shipping.
  http.get(api('shipping/unscheduled/'), ({ request }) => {
    const search = paramsOf(request).get('search')?.trim().toLowerCase()
    const placed = new Set(assignments.flatMap(row => row.order ?? []))
    const rows = orders
      .filter(
        order => order.ship_via === 'Delivery' && !gone.has(order.id) && !placed.has(order.id)
      )
      .filter(
        order =>
          !search ||
          [order.invoice, order.customer, order.city, order.address].some(text =>
            text?.toLowerCase().includes(search)
          )
      )
      .toSorted(
        (a, b) => a.ship_date.localeCompare(b.ship_date) || a.invoice.localeCompare(b.invoice)
      )
      .flatMap(order => factsOf(order.id) ?? [])
    return HttpResponse.json(paged(request, rows))
  }),

  http.post(api('shipping/selection-totals/'), async ({ request }) =>
    HttpResponse.json(selectionTotals(await bodyOf<SelectionBody>(request)))
  ),

  // The orange box over a truck's limit refuses nothing: the Manager splits it into Loads later.
  http.post(api('shipping/truck-panels/'), async ({ request }) => {
    const body = await bodyOf<SelectionBody & { ship_date: string }>(request)
    const totals = selectionTotals(body)
    const day = assignments.filter(row => row.ship_date === body.ship_date)
    return HttpResponse.json(
      byName().map(truck => {
        const already = totalWeight(day.filter(row => row.truck_id === truck.id))
        const carry = round2(already + totals.total_weight)
        return {
          truck_id: truck.id,
          name: truck.name,
          weight_limit: truck.max_weight,
          max_length: null,
          already_assigned_weight: already,
          selected_delivery: totals.delivery,
          selected_pickup: totals.pickup,
          assigned_weight: carry,
          over_weight_limit: !!truck.max_weight && carry > truck.max_weight
        }
      })
    )
  }),

  http.post(api('shipping/apply/'), async ({ request }) => {
    const body = await bodyOf<SelectionBody & { ship_date?: string; truck_id: number }>(request)
    const ids = body.orders ?? []
    const pickupIds = body.pickup_ids ?? []
    if (!body.ship_date) {
      return refuse('Pick a Ship Date first - the truck checkboxes need one.')
    }
    if (!ids.length && !pickupIds.length) return refuse('Select at least one order or pickup.')
    const truck = truckById(body.truck_id)
    if (!truck) return refuse(`Truck ${body.truck_id} not found`, 404)
    const missing = ids.filter(id => !orderById(id))
    if (missing.length) return refuse(`No such order(s): ${missing.join(', ')}.`, 404)
    for (const id of ids) {
      const row = assignments.find(a => a.order === id)
      if (row?.load_id) {
        return refuse(
          `Order ${orderById(id)?.invoice} is already on a Load; take it off the Load before rescheduling it.`,
          409
        )
      }
    }
    const pickups = pickupIds.map(id => assignments.find(a => a.id === id && a.kind === 'pickup'))
    const lost = pickupIds.find((_, at) => !pickups[at])
    if (lost !== undefined) return refuse(`No such pickup: ${lost}.`, 404)

    for (const id of ids) {
      const row = assignments.find(a => a.order === id)
      // Rescheduling moves the order's row rather than adding another.
      if (row) Object.assign(row, { ship_date: body.ship_date, truck_id: truck.id })
      else {
        assignments.push({
          id: nextId('assignment'),
          order: id,
          kind: 'delivery',
          ship_date: body.ship_date,
          truck_id: truck.id,
          load_id: null,
          status: null,
          supplier: null,
          description: null,
          pickup_weight: null,
          pickup_length: null
        })
      }
      // The chosen day is EBMS's ship date too.
      const order = orderById(id)
      if (order) order.ship_date = body.ship_date
    }
    for (const pickup of pickups) {
      if (pickup) Object.assign(pickup, { ship_date: body.ship_date, truck_id: truck.id })
    }
    return HttpResponse.json({
      ship_date: body.ship_date,
      truck_id: truck.id,
      truck: truck.name,
      orders: ids,
      pickups: pickupIds,
      push_ship_date_for: ids
    })
  }),

  // A card per truck; the Unassigned boxes go green once everything is on a Load.
  http.get(api('shipping/scheduled/'), ({ request }) => {
    const day = paramsOf(request).get('ship_date')
    if (!day) return refuse('ship_date is required', 422)
    const ofDay = assignments.filter(row => row.ship_date === day)
    return HttpResponse.json(
      byName().map(truck => {
        const mine = ofDay.filter(row => row.truck_id === truck.id)
        const totals = (kind: Assignment['kind']) => {
          const rows = mine.filter(row => row.kind === kind)
          const loose = rows.filter(row => row.load_id === null)
          const weight = totalWeight(rows)
          return {
            count: rows.length,
            total_weight: weight,
            unassigned_count: loose.length,
            unassigned_weight: totalWeight(loose),
            all_assigned: !loose.length,
            over_weight_limit: !!truck.max_weight && weight > truck.max_weight
          }
        }
        return {
          truck_id: truck.id,
          name: truck.name,
          weight_limit: truck.max_weight,
          delivery: totals('delivery'),
          pickup: totals('pickup'),
          orders: mine
            .toSorted((a, b) => (a.load_id ?? 0) - (b.load_id ?? 0) || a.id - b.id)
            .map(row => ({ ...assignmentRow(row), load_id: row.load_id }))
        }
      })
    )
  }),

  http.post(api('shipping/pickups/'), async ({ request }) => {
    const body = await bodyOf<{
      supplier: string
      description: string | null
      weight: number | null
      length: number | null
      ship_date: string
      truck_id: number
    }>(request)
    if (!truckById(body.truck_id)) return refuse(`Truck ${body.truck_id} not found`, 404)
    const pickup: Assignment = {
      id: nextId('assignment'),
      order: null,
      kind: 'pickup',
      ship_date: body.ship_date,
      truck_id: body.truck_id,
      load_id: null,
      status: null,
      supplier: body.supplier,
      description: body.description,
      pickup_weight: body.weight,
      pickup_length: body.length
    }
    assignments.push(pickup)
    return HttpResponse.json({
      id: pickup.id,
      supplier: pickup.supplier,
      ship_date: pickup.ship_date,
      truck_id: pickup.truck_id
    })
  }),

  /**
   * The truck's Load tabs, with one empty tab last to fill next. Reading never makes a Load: the empty
   * tab has no id until Add To Load creates it.
   */
  http.get(api('shipping/trucks/:truckId/loads/'), ({ params, request }) => {
    const truckId = Number(params.truckId)
    const day = paramsOf(request).get('ship_date')
    if (!day) return refuse('ship_date is required', 422)
    if (!truckById(truckId)) return refuse(`Truck ${truckId} not found`, 404)
    const tabs = loadsOf(truckId, day).map(tabOf)
    if (tabs.some(tab => tab.is_empty)) return HttpResponse.json(tabs)
    const next = Math.max(0, ...tabs.map(tab => tab.position)) + 1
    return HttpResponse.json([...tabs, emptyTab(next)])
  }),

  // Loading and the Driver: released Loads only unless `status` names others; empty Loads left out.
  http.get(api('shipping/loads/'), ({ request }) => {
    const params = paramsOf(request)
    const day = params.get('ship_date')
    if (!day) return refuse('ship_date is required', 422)
    const wanted = params.getAll('status')
    const bad = wanted.find(status => !STATUSES.includes(status as LoadStatus))
    if (bad) return refuse(`Input should be ${STATUSES.map(s => `'${s}'`).join(', ')}`, 422)
    const rank = new Map(byName().map((truck, at) => [truck.id, at]))
    return HttpResponse.json(
      loads
        .filter(load => load.load_date === day && rank.has(load.truck_id))
        .filter(load => (wanted.length ? wanted.includes(load.status ?? '') : isReleased(load)))
        .toSorted(
          (a, b) =>
            (rank.get(a.truck_id) ?? 0) - (rank.get(b.truck_id) ?? 0) ||
            a.position - b.position ||
            a.id - b.id
        )
        .map(load => {
          const truck = truckById(load.truck_id)
          return { ...tabOf(load), truck: truck ? { id: truck.id, name: truck.name } : null }
        })
        .filter(tab => !tab.is_empty)
    )
  }),

  http.post(api('shipping/loads/add/'), async ({ request }) => {
    const body = await bodyOf<{ assignment_ids?: number[]; load_id?: number | null }>(request)
    const ids = body.assignment_ids ?? []
    if (!ids.length) {
      return refuse('Select at least one order - Add To Load needs a selection.')
    }
    const rows = assignments.filter(row => ids.includes(row.id))
    const missing = ids.filter(id => !rows.some(row => row.id === id))
    if (missing.length) return refuse(`No such scheduled order(s): ${listed(missing)}.`, 404)
    const already = rows.filter(row => row.load_id !== null)
    if (already.length) {
      return refuse(`${already.length} of the selected order(s) are already on a Load.`, 409)
    }
    const truckIds = new Set(rows.map(row => row.truck_id))
    const days = new Set(rows.map(row => row.ship_date))
    if (truckIds.size > 1 || days.size > 1) {
      return refuse('A Load is one truck on one day; the selection spans more than that.')
    }
    const [first] = rows
    if (!first) return refuse('Select at least one order - Add To Load needs a selection.')
    let load: Load | null
    if (body.load_id === null || body.load_id === undefined) {
      const day = loadsOf(first.truck_id, first.ship_date)
      load = day.filter(row => !onLoad(row.id).length).at(-1) ?? null
      if (!load) {
        load = {
          id: nextId('load'),
          truck_id: first.truck_id,
          load_date: first.ship_date,
          position: Math.max(0, ...day.map(row => row.position)) + 1,
          status: null
        }
        loads.push(load)
      }
    } else {
      load = loadById(body.load_id)
      if (!load) return refuse(`Load ${body.load_id} not found`, 404)
      if (load.truck_id !== first.truck_id || load.load_date !== first.ship_date) {
        return refuse('That Load belongs to a different truck or day.')
      }
      if (isReleased(load)) return refuse('This Load has already been released to loading.', 409)
    }
    for (const row of rows) row.load_id = load.id
    load.status = 'unreleased'
    return HttpResponse.json({
      load_id: load.id,
      marker: `L-${load.position}`,
      status: load.status,
      weight: Math.trunc(totalWeight(onLoad(load.id))),
      added: rows.map(row => row.id),
      next_empty_load_id: null
    })
  }),

  http.post(api('shipping/loads/remove/'), async ({ request }) => {
    const { assignment_ids = [] } = await bodyOf<{ assignment_ids?: number[] }>(request)
    const rows = assignments.filter(row => assignment_ids.includes(row.id))
    for (const row of rows) {
      const load = row.load_id === null ? null : loadById(row.load_id)
      if (load && isReleased(load)) {
        return refuse(
          'That Load has been released to loading; orders cannot be taken off it here.',
          409
        )
      }
    }
    const touched = new Set<number>()
    for (const row of rows) {
      if (row.load_id === null) continue
      touched.add(row.load_id)
      row.load_id = null
      row.status = null
    }
    for (const id of touched) {
      const load = loadById(id)
      // An emptied Load reads like an untouched tab again.
      if (load && !onLoad(id).length) load.status = null
    }
    return HttpResponse.json({
      removed: rows.map(row => row.id),
      loads_updated: [...touched].toSorted((a, b) => a - b)
    })
  }),

  http.post(api('shipping/loads/:loadId/release/'), ({ params }) => {
    const load = loadById(Number(params.loadId))
    if (!load) return refuse(`Load ${String(params.loadId)} not found`, 404)
    const rows = onLoad(load.id)
    if (!rows.length) return refuse('This Load has no orders on it yet.')
    if (isReleased(load)) return refuse('This Load has already been released.', 409)
    load.status = 'not_started'
    for (const row of rows) row.status = 'not_started'
    return HttpResponse.json({ load_id: load.id, status: load.status, orders: rows.length })
  }),

  http.post(api('shipping/loads/:loadId/packages-loaded/'), async ({ params, request }) => {
    const load = loadById(Number(params.loadId))
    if (!load) return refuse(`Load ${String(params.loadId)} not found`, 404)
    if (DRIVER_OWNED.includes(load.status)) {
      return refuse('This Load has already left the warehouse.', 409)
    }
    if (!isReleased(load)) return refuse('This Load has not been released to loading yet.', 409)
    const { package_ids = [], loaded = true } = await bodyOf<{
      package_ids?: number[]
      loaded?: boolean
    }>(request)
    const allowed = onLoad(load.id).flatMap(row => (row.order ? packagesOf(row.order) : []))
    const foreign = package_ids.filter(id => !allowed.some(pkg => pkg.package_id === id))
    if (foreign.length) {
      return refuse(`Package(s) ${listed(foreign)} are not on any order on this Load.`)
    }
    for (const pkg of allowed) if (package_ids.includes(pkg.package_id)) pkg.is_loaded = loaded
    recalculate(load)
    return HttpResponse.json({
      load_id: load.id,
      status: load.status,
      orders: onLoad(load.id).map(row => ({
        assignment_id: row.id,
        order: row.order,
        status: row.status
      }))
    })
  }),

  // The checkboxes lock from here: the run is the Driver's.
  http.post(api('shipping/loads/:loadId/left-warehouse/'), ({ params }) => {
    const load = loadById(Number(params.loadId))
    if (!load) return refuse(`Load ${String(params.loadId)} not found`, 404)
    if (DRIVER_OWNED.includes(load.status)) {
      return refuse('This Load has already left the warehouse.', 409)
    }
    if (load.status !== 'loaded') {
      return refuse('Everything on this Load has to be Loaded before it can leave.')
    }
    const rows = onLoad(load.id)
    load.status = 'en_route'
    for (const row of rows) row.status = 'en_route'
    freeLeftLocations()
    return HttpResponse.json({
      load_id: load.id,
      status: load.status,
      orders_locked: true,
      orders: rows.length
    })
  }),

  // The Load follows its orders to Delivered only once every one of them is.
  http.post(api('shipping/delivered/'), async ({ request }) => {
    const { assignment_ids = [] } = await bodyOf<{ assignment_ids?: number[] }>(request)
    const rows = assignments.filter(row => assignment_ids.includes(row.id))
    const missing = assignment_ids.filter(id => !rows.some(row => row.id === id))
    if (missing.length) return refuse(`No such order(s) on a Load: ${listed(missing)}.`, 404)
    if (rows.some(row => row.load_id === null)) {
      return refuse('An order has to be on a Load to be delivered.')
    }
    const loadIds = [...new Set(rows.map(row => row.load_id as number))]
    if (loadIds.some(id => !DRIVER_OWNED.includes(loadById(id)?.status ?? null))) {
      return refuse('This Load has not left the warehouse yet.')
    }
    for (const row of rows) row.status = 'delivered'
    const finished = loadIds.filter(id => onLoad(id).every(row => row.status === 'delivered'))
    for (const id of finished) {
      const load = loadById(id)
      if (load) load.status = 'delivered'
    }
    return HttpResponse.json({ delivered: rows.map(row => row.id), loads_delivered: finished })
  }),

  // An explicit close-out: the board never says what turns Delivered into Completed.
  http.post(api('shipping/loads/:loadId/complete/'), ({ params }) => {
    const load = loadById(Number(params.loadId))
    if (!load) return refuse(`Load ${String(params.loadId)} not found`, 404)
    if (load.status !== 'delivered') {
      return refuse('A Load can only be Completed once it has been Delivered.')
    }
    load.status = 'completed'
    return HttpResponse.json({ load_id: load.id, status: load.status })
  }),

  http.get(api('shipping/loads/:loadId/route/'), ({ params }) =>
    HttpResponse.json(stopRows(Number(params.loadId)))
  ),

  http.post(api('shipping/loads/:loadId/route/'), ({ params, request }) => {
    const load = loadById(Number(params.loadId))
    if (!load) return refuse(`Load ${String(params.loadId)} not found`, 404)
    if (!onLoad(load.id).length) return refuse('This Load has no orders on it yet.')
    buildRoute(load, paramsOf(request).get('rebuild') === 'true')
    return HttpResponse.json(stopRows(load.id))
  }),

  // The whole run renumbered from the order sent; the warehouse keeps its place at the front.
  http.patch(api('shipping/loads/:loadId/route/'), async ({ params, request }) => {
    const loadId = Number(params.loadId)
    const stops = stopsOf(loadId)
    if (!stops.length) return refuse('This Load has no route yet.', 404)
    const { route_ids = [] } = await bodyOf<{ route_ids?: number[] }>(request)
    const unknown = route_ids.filter(id => !stops.some(stop => stop.id === id))
    if (unknown.length) {
      return refuse(`Stop(s) ${listed(unknown)} are not on this Load's route.`)
    }
    const deliveries = route_ids.flatMap(
      id => stops.find(stop => stop.id === id && !stop.dispatch_point) ?? []
    )
    const left = stops.filter(stop => !stop.dispatch_point && !deliveries.includes(stop))
    if (left.length) {
      return refuse(`The new order leaves out ${left.length} stop(s); send the whole sequence.`)
    }
    ;[...stops.filter(stop => stop.dispatch_point), ...deliveries].forEach(
      (stop, index) => (stop.position = index)
    )
    return HttpResponse.json(stopRows(loadId))
  })
]
