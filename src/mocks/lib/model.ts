import { departments } from '../handlers/departments'
import { locations, locationTypes, type SeedLocation } from '../seed/locations'
import { priorities } from '../seed/priorities'
import { now, today } from './dates'
import { deletedPackages, lines, nextCounter, orders, packages } from './state'
import type { Dept, DeptState, ItemState, Line, Order, Pkg } from './types'

export const title = (text: string) =>
  text.toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase())

export const round2 = (value: number) => Math.round(value * 100) / 100

export const orderById = (id: string) => orders.find(order => order.id === id)
export const lineById = (id: string) => lines.find(line => line.id === id)
export const linesOfOrder = (order: Order, dept?: Dept) =>
  lines.filter(line => line.order === order.id && (dept === undefined || line.dept === dept))

export const deptName = (dept: Dept) => departments.find(row => row.id === dept)?.name ?? ''

export const maxPackageWeight = (dept: Dept) =>
  departments.find(row => row.id === dept)?.max_package_weight ?? null

export const priorityOf = (id: number | null | undefined) =>
  priorities.find(row => row.id === id) ?? null

export const needOf = (line: Line) => Math.max(0, line.quantity - (line.item?.pull_from_stock ?? 0))

export const wrappedOf = (line: Line) =>
  packages.reduce(
    (total, pkg) =>
      total +
      pkg.contents.reduce((sum, row) => sum + (row.origin_item === line.id ? row.quantity : 0), 0),
    0
  )

export const lineWeight = (line: Line) => round2(line.unit_weight * line.quantity)

export const orderWeight = (order: Order) =>
  round2(linesOfOrder(order).reduce((total, line) => total + lineWeight(line), 0))

export const isScheduled = (line: Line) => !!line.item?.production_date

export const isDone = (order: Order, dept: Dept) => !!order.states[dept]?.completed_at

/** What a line reads once everything the floor has packed of it is counted. */
export const doneStatus = (dept: Dept) => (dept === 3 ? 'packaged' : 'wrapped')

export const readyStatus = (dept: Dept) => (dept === 1 ? 'bent' : 'not_started')

// A bypassed line still has to be packed, and reads Wrapped once it is.
export const refreshLine = (line: Line) => {
  const item = line.item
  if (!item) return
  const need = needOf(line)
  const wrapped = wrappedOf(line)
  if (need === 0) item.status = 'stock'
  else if (wrapped >= need) item.status = doneStatus(line.dept)
  else if (item.bypassed) item.status = 'bypassed'
  else if (wrapped > 0) item.status = 'in_progress'
  else if (item.status === 'in_progress' || item.status === doneStatus(line.dept)) {
    item.status = readyStatus(line.dept)
  }
}

/**
 * On the bench: released, in a department with a release step. Accessories has none and packs
 * whatever is scheduled (RELEASED_DEPARTMENTS on the server).
 */
export const onBench = (line: Line) =>
  line.dept === 3 ? !!line.item?.production_date : !!line.item?.is_released

export const deptStatus = (order: Order, dept: Dept) => {
  if (order.states[dept]?.completed_at) return 'completed'
  const released = linesOfOrder(order, dept).filter(onBench)
  if (!released.length) return null
  if (released.every(line => line.item?.bypassed)) return 'bypassed'
  const done = doneStatus(dept)
  if (released.every(line => line.item?.status === done || line.item?.status === 'stock'))
    return done
  if (released.some(line => ['in_progress', done].includes(line.item?.status ?? ''))) {
    return 'in_progress'
  }
  return 'not_started'
}

export const firstDay = (order: Order, dept: Dept) =>
  linesOfOrder(order, dept)
    .map(line => line.item?.production_date)
    .filter((day): day is string => !!day)
    .toSorted()[0] ?? null

export const ensureSalesOrder = (order: Order) => {
  order.sales_order_id ??= nextCounter('salesOrder')
  return order.sales_order_id
}

export const ensureDeptState = (order: Order, dept: Dept): DeptState => {
  ensureSalesOrder(order)
  order.states[dept] ??= {
    id: nextCounter('departmentState'),
    priority: null,
    completed_at: null
  }
  return order.states[dept]
}

export const blankItem = (): ItemState => ({
  id: nextCounter('item'),
  status: null,
  production_date: null,
  reviewed: false,
  is_released: false,
  exported_at: null,
  flow: null,
  vented: false,
  pull_from_stock: null,
  width: null,
  description: null,
  supplier: null,
  coil_number: null,
  coil_icon: null,
  coil_fields_locked: false,
  bypassed: false
})

export const ensureItem = (line: Line) => {
  line.item ??= blankItem()
  return line.item
}

// --- Locations ---------------------------------------------------------------------------------

/** Where a department packs to: its own locations, the coil cradles that belong to no bench left out. */
export const packLocations = (dept: Dept) =>
  locations.filter(location => {
    const type = locationTypes.find(row => row.id === location.location_type_id)
    return type?.department_id === dept && type.name !== 'Coil Cradle'
  })

export const locationById = (id: number | null) => locations.find(row => row.id === id) ?? null

export const packagesOn = (locationId: number) =>
  packages.filter(pkg => pkg.location_id === locationId)

export const usedWeight = (locationId: number) =>
  round2(packagesOn(locationId).reduce((total, pkg) => total + pkg.weight, 0))

export const ordersOn = (locationId: number) =>
  new Set(packagesOn(locationId).map(pkg => pkg.order))

export const hasRoom = (location: SeedLocation, order: string, weight: number) => {
  const there = ordersOn(location.id)
  if (!there.has(order)) {
    if (!location.multi_order && there.size > 0) return false
    if (location.max_orders !== null && there.size >= location.max_orders) return false
  }
  return usedWeight(location.id) + weight <= location.weight
}

/** The order's newest location while it has room, else the first location that does. */
export const pickLocation = (order: Order, dept: Dept, weight: number, force = false) => {
  const mine = packages.filter(pkg => pkg.order === order.id && pkg.location_id !== null).at(-1)
  const current = locationById(mine?.location_id ?? null)
  if (current && hasRoom(current, order.id, weight)) return current.id
  const free = packLocations(dept).find(location => hasRoom(location, order.id, weight))
  if (free || !force) return free?.id ?? null
  // A seed day has more orders waiting than the plant has benches; stack where the most room is left.
  return (
    packLocations(dept).toSorted(
      (a, b) => b.weight - usedWeight(b.id) - (a.weight - usedWeight(a.id))
    )[0]?.id ?? null
  )
}

// --- Packages ----------------------------------------------------------------------------------

const PACKAGE_CODE: Record<Dept, string> = { 1: '01', 2: '02', 3: '03' }

/** The label code: department, order number, then a count that never fills a deleted one's gap. */
const packageName = (order: Order, dept: Dept) => {
  const prefix = `${PACKAGE_CODE[dept]}-${order.invoice}-`
  const used = [...packages.map(pkg => pkg.name), ...deletedPackages]
    .filter(name => name.startsWith(prefix))
    .map(name => Number(name.slice(prefix.length)) || 0)
  return `${prefix}${Math.max(0, ...used) + 1}`
}

export type PackagePart = { line: Line; quantity: number }

export const addPackage = (
  order: Order,
  dept: Dept,
  parts: PackagePart[],
  locationId: number | null,
  weight?: number,
  createdAt = now()
) => {
  const id = nextCounter('package')
  const pkg: Pkg = {
    package_id: id,
    name: packageName(order, dept),
    order: order.id,
    department: dept,
    weight:
      weight ?? round2(parts.reduce((total, p) => total + p.line.unit_weight * p.quantity, 0)),
    location_id: locationId,
    is_loaded: false,
    contents: parts.map(part => ({ origin_item: part.line.id, quantity: part.quantity })),
    created_at: createdAt
  }
  packages.push(pkg)
  for (const part of parts) refreshLine(part.line)
  return pkg
}

export const removePackage = (id: number) => {
  const at = packages.findIndex(pkg => pkg.package_id === id)
  const [pkg] = at === -1 ? [] : packages.splice(at, 1)
  if (pkg) deletedPackages.add(pkg.name)
  for (const row of pkg?.contents ?? []) {
    const line = lineById(row.origin_item)
    if (line) refreshLine(line)
  }
  return pkg ?? null
}

export const isOverdue = (order: Order, dept: Dept) => {
  const first = firstDay(order, dept)
  if (!first || first >= today() || isDone(order, dept)) return false
  return linesOfOrder(order, dept).some(line => line.item?.status !== doneStatus(dept))
}
