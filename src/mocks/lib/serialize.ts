import { machines } from '../seed/machines'
import { today } from './dates'
import {
  deptName,
  deptStatus,
  doneStatus,
  firstDay,
  isOverdue,
  linesOfOrder,
  lineWeight,
  locationById,
  priorityOf
} from './model'
import { packages } from './state'
import type { Dept, Line, Order } from './types'

export const machineRow = (id: number | null | undefined) =>
  machines.find(row => row.id === id) ?? null

export const serializeItem = (line: Line) => {
  const item = line.item
  if (!item) return null
  const late =
    !!item.production_date &&
    item.production_date < today() &&
    ![doneStatus(line.dept), 'stock'].includes(item.status ?? '')
  return {
    id: item.id,
    status: item.status,
    production_date: item.production_date,
    department: line.dept,
    over_due: late,
    reviewed: item.reviewed,
    is_released: item.is_released,
    exported_at: item.exported_at,
    flow: machineRow(item.flow),
    vented: item.vented,
    pull_from_stock: item.pull_from_stock,
    width: item.width,
    description: item.description,
    supplier: item.supplier,
    coil_number: item.coil_number,
    coil_icon: item.coil_icon,
    coil_fields_locked: item.coil_fields_locked
  }
}

export const serializeLine = (line: Line) => ({
  id: line.id,
  category: deptName(line.dept),
  id_inven: line.product_id,
  description: line.description,
  quantity: line.quantity,
  shipped: line.shipped,
  width: line.width,
  length: line.length,
  bends: line.bends,
  weight: lineWeight(line),
  color: line.color,
  gauge: line.gauge,
  profile: line.profile,
  machine_id: line.machine_id,
  item: serializeItem(line)
})

const serializeState = (order: Order, dept: Dept) => {
  const state = order.states[dept]
  if (!state) return null
  const mine = linesOfOrder(order, dept).filter(line => line.item?.production_date)
  return {
    id: state.id,
    department: dept,
    reviewed: mine.length > 0 && mine.every(line => line.item?.reviewed),
    release_to_production: mine.some(line => line.item?.is_released),
    priority: priorityOf(state.priority),
    production_date: firstDay(order, dept),
    status: deptStatus(order, dept),
    over_due: isOverdue(order, dept)
  }
}

export const serializeSalesOrder = (order: Order) => ({
  id: order.sales_order_id,
  order: order.id,
  is_stock: order.is_stock,
  department_states: ([1, 2, 3] as const).flatMap(dept => serializeState(order, dept) ?? [])
})

/** The codes the department's packages for the order stand on, oldest first. */
export const locationCodes = (order: Order, dept?: Dept) => [
  ...new Set(
    packages
      .filter(pkg => pkg.order === order.id && (dept === undefined || pkg.department === dept))
      .flatMap(pkg => locationById(pkg.location_id)?.code ?? [])
  )
]

export const serializeOrder = (order: Order, dept: Dept, shown: Line[]) => {
  const mine = linesOfOrder(order, dept)
  return {
    id: order.id,
    invoice: order.invoice,
    customer: order.customer,
    ship_date: order.ship_date,
    crea_date: order.crea_date,
    count_items: mine.length,
    total_weight: Math.round(mine.reduce((total, line) => total + lineWeight(line), 0) * 100) / 100,
    ship_via: order.ship_via,
    po_no: order.po_no,
    salesman: order.salesman,
    locations: locationCodes(order, dept),
    sales_order: order.sales_order_id ? serializeSalesOrder(order) : null,
    origin_items: shown.map(serializeLine)
  }
}
