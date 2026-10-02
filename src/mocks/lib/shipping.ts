import { orderPlans } from '../seed/orders'
import { trucks } from '../seed/trucks'
import { warehouses } from '../seed/warehouses'
import { workDay } from './dates'
import { linesOfOrder, locationById, orderById, orderWeight, packages, round2 } from './world'
import type { Order } from './types'

export type LoadStatus =
  | 'unreleased'
  | 'not_started'
  | 'loading'
  | 'loaded'
  | 'en_route'
  | 'delivered'
  | 'completed'

/** One order, or one supplier pickup, put on a truck for a day; a Load comes later. */
export type Assignment = {
  id: number
  /** `null` for a supplier pickup: no sales order behind it. */
  order: string | null
  kind: 'delivery' | 'pickup'
  ship_date: string
  truck_id: number
  load_id: number | null
  /** The order's own status on its Load — blank until Release To Loading. */
  status: LoadStatus | null
  supplier: string | null
  description: string | null
  pickup_weight: number | null
  pickup_length: number | null
}

export type Load = {
  id: number
  truck_id: number
  load_date: string
  /** The Load's number on its truck and day: «Load 2», marked «L-2». */
  position: number
  /** `null` while nothing is on it, the way an untouched tab reads. */
  status: LoadStatus | null
}

export type RouteStop = {
  id: number
  load_id: number
  order: string | null
  name: string | null
  address: string | null
  city: string | null
  state: string | null
  dispatch_point: boolean
  position: number
}

export const assignments: Assignment[] = []
export const loads: Load[] = []
export const routeStops: RouteStop[] = []

const ids = { assignment: 0, load: 0, stop: 0 }
export const nextId = (key: keyof typeof ids) => (ids[key] += 1)

/** From En Route on, the statuses are what the Driver reported, not what the packages say. */
export const DRIVER_OWNED: (LoadStatus | null)[] = ['en_route', 'delivered', 'completed']

export const isReleased = (load: Load) => load.status !== null && load.status !== 'unreleased'

// --- Facts ---------------------------------------------------------------------------------------

/** Pounds, as EBMS sums its line weights. */
export const weightOfOrder = (order: Order) => orderWeight(order)

/** Inches: the longest line on the order, accessories counting as none. */
export const longestOfOrder = (order: Order) =>
  Math.max(0, ...linesOfOrder(order).map(line => line.length ?? 0))

export const weightOf = (row: Assignment) => {
  if (row.kind === 'pickup') return row.pickup_weight ?? 0
  const order = row.order ? orderById(row.order) : undefined
  return order ? weightOfOrder(order) : 0
}

export const totalWeight = (rows: Assignment[]) =>
  round2(rows.reduce((total, row) => total + weightOf(row), 0))

export const truckById = (id: number) => trucks.find(truck => truck.id === id) ?? null

export const loadById = (id: number) => loads.find(load => load.id === id) ?? null

export const onLoad = (loadId: number) =>
  assignments.filter(row => row.load_id === loadId).toSorted((a, b) => a.id - b.id)

export const loadsOf = (truckId: number, day: string) =>
  loads
    .filter(load => load.truck_id === truckId && load.load_date === day)
    .toSorted((a, b) => a.position - b.position || a.id - b.id)

/** The packages of the whole order, whichever department wrapped them. */
export const packagesOf = (order: string) => packages.filter(pkg => pkg.order === order)

// --- Status ladder -------------------------------------------------------------------------------

/**
 * Not Started → Loading → Loaded, derived from the packages so un-marking one walks the statuses
 * back. Untouched before release and after the truck leaves.
 */
export const recalculate = (load: Load) => {
  if (!isReleased(load) || DRIVER_OWNED.includes(load.status)) return
  let anyLoaded = false
  let allLoaded = true
  for (const row of onLoad(load.id)) {
    // A supplier pickup has no packages, so — as on the server — it keeps its Load from Loaded.
    const mine = row.order ? packagesOf(row.order) : []
    const loaded = mine.filter(pkg => pkg.is_loaded)
    if (loaded.length) anyLoaded = true
    if (mine.length && loaded.length === mine.length) row.status = 'loaded'
    else {
      row.status = loaded.length ? 'loading' : 'not_started'
      allLoaded = false
    }
  }
  load.status = allLoaded ? 'loaded' : anyLoaded ? 'loading' : 'not_started'
}

/**
 * The server frees a location fifteen minutes after its last package went onto a truck; here that
 * happens when the truck leaves. A package with nothing in it never holds a location.
 */
export const freeLeftLocations = () => {
  const held = new Map<number, boolean>()
  for (const pkg of packages) {
    if (pkg.location_id === null || !pkg.contents.length) continue
    held.set(pkg.location_id, (held.get(pkg.location_id) ?? true) && pkg.is_loaded)
  }
  for (const pkg of packages) {
    if (pkg.location_id !== null && held.get(pkg.location_id)) pkg.location_id = null
  }
}

// --- Route ---------------------------------------------------------------------------------------

/** Where the run starts: the warehouses the orders' packages stand in, else the default one. */
const dispatchWarehouses = (orders: string[]) => {
  const found = new Set(
    packages
      .filter(pkg => orders.includes(pkg.order))
      .flatMap(pkg => locationById(pkg.location_id)?.warehouse_id ?? [])
  )
  const rows = warehouses.filter(row => found.has(row.id))
  return rows.length ? rows : warehouses.filter(row => row.is_default).slice(0, 1)
}

export const stopsOf = (loadId: number) =>
  routeStops
    .filter(stop => stop.load_id === loadId)
    .toSorted((a, b) => a.position - b.position || a.id - b.id)

/** Adds the stops the Load lacks; ones already placed keep the place the Manager dragged them to. */
export const buildRoute = (load: Load, rebuild: boolean) => {
  if (rebuild) {
    for (const stop of stopsOf(load.id)) routeStops.splice(routeStops.indexOf(stop), 1)
  }
  const existing = stopsOf(load.id)
  const deliveries = onLoad(load.id).filter(row => row.kind === 'delivery' && row.order)
  const orders = deliveries.flatMap(row => row.order ?? [])
  const known = new Set(existing.map(stop => stop.order))
  let position = existing.length ? Math.max(...existing.map(stop => stop.position)) + 1 : 0
  const created: RouteStop[] = []
  if (!existing.some(stop => stop.dispatch_point)) {
    for (const warehouse of dispatchWarehouses(orders)) {
      created.push({
        id: nextId('stop'),
        load_id: load.id,
        order: null,
        name: warehouse.name,
        address: warehouse.address,
        city: null,
        state: null,
        dispatch_point: true,
        position: position++
      })
    }
  }
  // A pickup carries no address, so the server leaves it off the map rather than invent one.
  for (const id of orders) {
    const order = orderById(id)
    if (!order || known.has(id)) continue
    created.push({
      id: nextId('stop'),
      load_id: load.id,
      order: id,
      name: order.customer,
      address: order.address,
      city: order.city,
      state: order.state,
      dispatch_point: false,
      position: position++
    })
  }
  if (!created.length) return
  routeStops.push(...created)
  // The warehouse leads even when it joins a route planned before.
  ;[...existing, ...created]
    .toSorted(
      (a, b) => Number(b.dispatch_point) - Number(a.dispatch_point) || a.position - b.position
    )
    .forEach((stop, index) => (stop.position = index))
}

// --- Seed ----------------------------------------------------------------------------------------

const seed = () => {
  const byKey = new Map<string, Load>()
  for (const plan of orderPlans) {
    const trip = plan.trip
    if (!trip) continue
    const day = workDay(trip.day)
    let load: Load | null = null
    if (trip.load !== null) {
      const key = `${trip.truck}/${day}/${trip.load}`
      load = byKey.get(key) ?? null
      if (!load) {
        load = {
          id: nextId('load'),
          truck_id: trip.truck,
          load_date: day,
          position: trip.load,
          status: (trip.status as LoadStatus | undefined) ?? 'unreleased'
        }
        byKey.set(key, load)
        loads.push(load)
      }
    }
    const status = load?.status ?? null
    assignments.push({
      id: nextId('assignment'),
      order: String(plan.no),
      kind: 'delivery',
      ship_date: day,
      truck_id: trip.truck,
      load_id: load?.id ?? null,
      // An order on a closed Load was delivered; one on an unreleased Load has no status yet.
      status: status === 'unreleased' ? null : status === 'completed' ? 'delivered' : status,
      supplier: null,
      description: null,
      pickup_weight: null,
      pickup_length: null
    })
  }

  for (const load of loads) {
    const rows = onLoad(load.id)
    if (load.status === 'loading') {
      // On the dock: the first order all on the truck, the second half on, the rest still racked.
      rows.forEach((row, index) => {
        const mine = row.order ? packagesOf(row.order) : []
        const take = index === 0 ? mine.length : index === 1 ? Math.ceil(mine.length / 2) : 0
        mine.forEach((pkg, at) => (pkg.is_loaded = at < take))
      })
      recalculate(load)
      buildRoute(load, false)
    }
    if (load.status === 'en_route') {
      // One stop made already.
      const first = rows[0]
      if (first) first.status = 'delivered'
      buildRoute(load, false)
    }
  }

  assignments.push({
    id: nextId('assignment'),
    order: null,
    kind: 'pickup',
    ship_date: workDay(0),
    truck_id: 2,
    load_id: null,
    status: null,
    supplier: 'Midwest Fastener Co.',
    description: 'Two cases of 1" pancake screws',
    pickup_weight: 180,
    pickup_length: 24
  })
}

seed()
