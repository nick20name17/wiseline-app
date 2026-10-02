import { http, HttpResponse } from 'msw'
import { machines } from '../seed/machines'
import { holidays } from '../seed/holidays'
import { coilsForDepartment } from '../lib/coils'
import { createCutlists } from '../lib/cutlists'
import { addDays, isWeekend, now, today } from '../lib/dates'
import { bodyOf, notFound, paged, paramsOf, refuse } from '../lib/http'
import {
  blankItem,
  deptName,
  doneStatus,
  ensureDeptState,
  ensureItem,
  ensureSalesOrder,
  firstDay,
  isDone,
  isOverdue,
  isScheduled,
  lineById,
  lineNotes,
  lines,
  linesOfOrder,
  needOf,
  orderById,
  orders,
  priorityOf,
  refreshLine
} from '../lib/world'
import { serializeItem, serializeOrder, serializeSalesOrder } from '../lib/serialize'
import type { Dept, Line, Order } from '../lib/types'
import { api } from '../url'
import { departments } from './departments'

const deptByName = (name: string | null) =>
  departments.find(row => row.name.toLowerCase() === name?.toLowerCase())?.id as Dept | undefined

const open = (line: Line) =>
  !['wrapped', 'packaged', 'shipped', 'stock'].includes(line.item?.status ?? '')

const priorityPosition = (order: Order, dept: Dept) =>
  priorityOf(order.states[dept]?.priority)?.position ?? 99

type View = { dept: Dept; keep: (line: Line) => boolean; whole: boolean }

/** Orders with their lines narrowed to what a tab shows, in the order the board lists them. */
const listOrders = (view: View, request: Request) => {
  const params = paramsOf(request)
  const search = params.get('search')?.toLowerCase()
  const only = params.get('order')
  const rows = orders.flatMap(order => {
    if (view.dept !== 1 && order.is_stock) return []
    if (only && order.id !== only && order.invoice !== only) return []
    const mine = linesOfOrder(order, view.dept)
    if (!mine.length || isDone(order, view.dept)) return []
    const shown = view.whole ? mine : mine.filter(view.keep)
    if (!shown.length) return []
    if (search) {
      const hay = [
        order.invoice,
        order.customer,
        order.po_no,
        ...mine.map(l => `${l.product_id} ${l.description}`)
      ]
      if (!hay.join(' ').toLowerCase().includes(search)) return []
    }
    return [{ order, shown }]
  })
  return rows.toSorted(
    (a, b) =>
      (firstDay(a.order, view.dept) ?? a.order.ship_date).localeCompare(
        firstDay(b.order, view.dept) ?? b.order.ship_date
      ) ||
      priorityPosition(a.order, view.dept) - priorityPosition(b.order, view.dept) ||
      b.order.invoice.localeCompare(a.order.invoice)
  )
}

const viewOf = (request: Request): View | null => {
  const params = paramsOf(request)
  const dept = deptByName(params.get('category'))
  if (!dept) return null
  if (params.get('order')) return { dept, keep: () => true, whole: true }
  const from = params.get('production_date__gte')
  const to = params.get('production_date__lte')
  const scheduled = params.get('is_scheduled') === 'true'
  const released = params.get('release_to_production') === 'true'
  return {
    dept,
    whole: false,
    keep: line => {
      if (!scheduled) return !isScheduled(line)
      if (!isScheduled(line)) return false
      const day = line.item?.production_date ?? ''
      if (from && day < from) return false
      if (to && day > to) return false
      if (released && !line.item?.is_released) return false
      return true
    }
  }
}

const countOrders = (dept: Dept, scheduled: boolean) =>
  orders.filter(order => {
    if (dept !== 1 && order.is_stock) return false
    const mine = linesOfOrder(order, dept)
    return !isDone(order, dept) && mine.some(line => isScheduled(line) === scheduled)
  }).length

const pieces = (line: Line) => needOf(line)
const stockOf = (line: Line) => Math.min(line.quantity, line.item?.pull_from_stock ?? 0)

const liveLines = (dept: Dept) =>
  lines.filter(line => {
    const order = orderById(line.order)
    return line.dept === dept && isScheduled(line) && order && !isDone(order, dept)
  })

const benders = (dept: Dept) =>
  machines.filter(row => row.department === dept && ['bending', 'rollforming'].includes(row.kind))

const capacityOf = (dept: Dept) => {
  const total = benders(dept).reduce((sum, row) => sum + (row.daily_max_bends ?? 0), 0)
  return total > 0 ? total : null
}

const dayFigures = (dept: Dept, day: string) => {
  const rows = liveLines(dept).filter(line => line.item?.production_date === day)
  const figures = {
    pieces: rows.reduce((sum, line) => sum + pieces(line), 0),
    pieces_from_stock: rows.reduce((sum, line) => sum + stockOf(line), 0),
    bends: rows.reduce((sum, line) => sum + pieces(line) * line.bends, 0),
    bends_from_stock: rows.reduce((sum, line) => sum + stockOf(line) * line.bends, 0)
  }
  return { rows, ...figures }
}

const holidayOn = (day: string) => holidays.find(row => row.date === day)?.name ?? null

const stripEntry = (dept: Dept, day: string) => {
  const { rows: _rows, ...figures } = dayFigures(dept, day)
  const capacity = capacityOf(dept)
  const holiday = holidayOn(day)
  return {
    date: day,
    ...figures,
    capacity,
    over_capacity: capacity !== null && figures.bends > capacity,
    is_work_day: !isWeekend(day) && !holiday,
    holiday
  }
}

/** Moves an unscheduled line onto a day, the way the schedule and split endpoints both do. */
const scheduleLine = (line: Line, day: string) => {
  const item = ensureItem(line)
  item.production_date = day
  // Accessories packs from the day it is scheduled; it has no release step.
  if (line.dept === 3) item.status ??= 'not_started'
}

const releaseDay = (dept: Dept, order: Order, day: string, exported: boolean) => {
  const released: Line[] = []
  for (const line of linesOfOrder(order, dept)) {
    const item = line.item
    if (!item || item.production_date !== day || item.is_released) continue
    item.is_released = true
    item.reviewed = true
    item.status = 'not_started'
    if (exported) item.exported_at = now()
    if (dept === 1 && item.flow === null) {
      item.flow = machines.find(row => row.department === 1 && row.kind === 'bending')?.id ?? null
    }
    released.push(line)
  }
  return released
}

export const boardOrdersHandlers = [
  http.get(api('ebms/orders/'), ({ request }) => {
    const view = viewOf(request)
    if (!view) return HttpResponse.json({ count: 0, results: [] })
    const params = paramsOf(request)
    let rows = listOrders(view, request)
    if (params.get('has_open_lines') === 'true') {
      rows = rows.filter(row => row.shown.some(open))
    }
    const page = paged(
      request,
      rows.map(row => serializeOrder(row.order, view.dept, row.shown))
    )
    return HttpResponse.json(page)
  }),

  http.get(api('departments/:id/counts/'), ({ params }) => {
    const dept = Number(params.id) as Dept
    return HttpResponse.json({
      unscheduled: countOrders(dept, false),
      scheduled: countOrders(dept, true),
      coils: coilsForDepartment(dept).length
    })
  }),

  http.get(api('departments/:id/overdue/'), ({ params }) => {
    const dept = Number(params.id) as Dept
    const late = lines.filter(line => {
      const order = orderById(line.order)
      return (
        line.dept === dept &&
        order &&
        isOverdue(order, dept) &&
        line.item?.production_date &&
        line.item.production_date < today() &&
        open(line)
      )
    })
    const byDay: Record<string, Set<string>> = {}
    for (const line of late) {
      const day = line.item?.production_date ?? ''
      byDay[day] ??= new Set()
      byDay[day].add(line.order)
    }
    const days = Object.keys(byDay).toSorted()
    return HttpResponse.json({
      days,
      orders_by_day: Object.fromEntries(days.map(day => [day, byDay[day]?.size ?? 0])),
      orders: new Set(late.map(line => line.order)).size,
      line_items: late.length
    })
  }),

  http.get(api('departments/:id/machine-capacities/'), ({ params, request }) => {
    const dept = Number(params.id) as Dept
    const day = paramsOf(request).get('day') ?? today()
    const { rows, ...total } = dayFigures(dept, day)
    const capacity = capacityOf(dept)
    const mine = benders(dept)
    return HttpResponse.json({
      date: day,
      total: { ...total, capacity, over_capacity: capacity !== null && total.bends > capacity },
      machines: mine.map(machine => {
        const on = rows.filter(
          line => (dept === 1 ? line.item?.flow : line.machine_id) === machine.id
        )
        const bends = on.reduce((sum, line) => sum + pieces(line) * line.bends, 0)
        return {
          flow_id: machine.id,
          name: machine.name,
          pieces: on.reduce((sum, line) => sum + pieces(line), 0),
          pieces_from_stock: on.reduce((sum, line) => sum + stockOf(line), 0),
          max_pieces: machine.daily_max_pieces,
          bends,
          bends_from_stock: on.reduce((sum, line) => sum + stockOf(line) * line.bends, 0),
          max_bends: machine.daily_max_bends,
          over_bends: machine.daily_max_bends !== null && bends > machine.daily_max_bends
        }
      }),
      pieces_without_a_machine: rows
        .filter(line => !(dept === 1 ? line.item?.flow : line.machine_id))
        .reduce((sum, line) => sum + pieces(line), 0)
    })
  }),

  http.get(api('departments/:id/day-strip/'), ({ params, request }) => {
    const dept = Number(params.id) as Dept
    const search = paramsOf(request)
    const dates = search.getAll('dates')
    if (dates.length) return HttpResponse.json(dates.map(day => stripEntry(dept, day)))
    const start = search.get('start') ?? today()
    const count = Number(search.get('days') ?? 1)
    const workOnly = search.get('work_days_only') === 'true'
    const result = []
    for (let day = start; result.length < count; day = addDays(day, 1)) {
      const entry = stripEntry(dept, day)
      if (!workOnly || entry.is_work_day) result.push(entry)
    }
    return HttpResponse.json(result)
  }),

  http.get(api('departments/:id/allocated-stock/'), ({ params, request }) => {
    const dept = Number(params.id) as Dept
    const search = paramsOf(request).get('search')?.toLowerCase()
    const sums = new Map<
      string,
      { color: string | null; product_id: string; description: string; qty: number }
    >()
    for (const line of liveLines(dept)) {
      const order = orderById(line.order)
      const qty = stockOf(line)
      if (!order || qty === 0 || line.item?.status === doneStatus(dept) || !line.item?.reviewed)
        continue
      const key = `${line.color}|${line.product_id}`
      const row = sums.get(key) ?? {
        color: line.color,
        product_id: line.product_id,
        description: line.description,
        qty: 0
      }
      row.qty += qty
      sums.set(key, row)
    }
    const rows = [...sums.values()]
      .filter(
        row =>
          !search ||
          `${row.product_id} ${row.description} ${row.color}`.toLowerCase().includes(search)
      )
      .toSorted(
        (a, b) =>
          (a.color ?? '').localeCompare(b.color ?? '') || a.product_id.localeCompare(b.product_id)
      )
    return HttpResponse.json(
      rows.map((row, index) => ({
        ...row,
        starts_color_group: row.color !== rows[index - 1]?.color
      }))
    )
  }),

  http.post(api('sales-orders/'), async ({ request }) => {
    const { order: id } = await bodyOf<{ order: string }>(request)
    const order = orderById(id)
    if (!order) return notFound()
    ensureSalesOrder(order)
    return HttpResponse.json(serializeSalesOrder(order), { status: 201 })
  }),

  http.post(api('sales-orders/schedule/'), async ({ request }) => {
    const body = await bodyOf<{ department: Dept; orders: number[]; production_date: string }>(
      request
    )
    let count = 0
    for (const order of orders.filter(row => body.orders.includes(row.sales_order_id ?? -1))) {
      ensureDeptState(order, body.department)
      for (const line of linesOfOrder(order, body.department).filter(row => !isScheduled(row))) {
        scheduleLine(line, body.production_date)
        count += 1
      }
    }
    return HttpResponse.json({ scheduled: count })
  }),

  http.post(
    api('sales-orders/:salesOrder/departments/:dept/schedule/'),
    async ({ params, request }) => {
      const body = await bodyOf<{ production_date: string; origin_items: string[] }>(request)
      const order = orders.find(row => row.sales_order_id === Number(params.salesOrder))
      if (!order) return notFound()
      ensureDeptState(order, Number(params.dept) as Dept)
      for (const id of body.origin_items) {
        const line = lineById(id)
        if (line) scheduleLine(line, body.production_date)
      }
      return HttpResponse.json({ scheduled: body.origin_items.length })
    }
  ),

  http.post(api('sales-orders/:salesOrder/departments/:dept/bypass/'), ({ params }) => {
    const dept = Number(params.dept) as Dept
    const order = orders.find(row => row.sales_order_id === Number(params.salesOrder))
    if (!order) return notFound()
    ensureDeptState(order, dept)
    for (const line of linesOfOrder(order, dept)) {
      const item = ensureItem(line)
      item.production_date ??= today()
      item.reviewed = true
      item.is_released = true
      item.bypassed = true
      item.status = 'bypassed'
    }
    return HttpResponse.json({ bypassed: true })
  }),

  http.post(
    api('sales-orders/:salesOrder/departments/:dept/unschedule/'),
    ({ params, request }) => {
      const dept = Number(params.dept) as Dept
      const order = orders.find(row => row.sales_order_id === Number(params.salesOrder))
      if (!order) return notFound()
      const day = paramsOf(request).get('production_date')
      for (const line of linesOfOrder(order, dept)) {
        if (!line.item?.production_date || (day && line.item.production_date !== day)) continue
        const hasNotes = lineNotes.some(note => note.item === line.id)
        line.item = null
        if (hasNotes) line.item = blankItem()
      }
      const state = order.states[dept]
      if (state && !linesOfOrder(order, dept).some(isScheduled)) state.priority = null
      return HttpResponse.json({ unscheduled: true })
    }
  ),

  http.patch(api('sales-orders/:salesOrder/departments/:dept/'), async ({ params, request }) => {
    const dept = Number(params.dept) as Dept
    const order = orders.find(row => row.sales_order_id === Number(params.salesOrder))
    if (!order) return notFound()
    const state = ensureDeptState(order, dept)
    const body = await bodyOf<{ priority?: number | null; reviewed?: boolean }>(request)
    if ('priority' in body) state.priority = body.priority ?? null
    if (typeof body.reviewed === 'boolean') {
      const day = paramsOf(request).get('production_date')
      for (const line of linesOfOrder(order, dept)) {
        if (line.item?.production_date && (!day || line.item.production_date === day)) {
          line.item.reviewed = body.reviewed
        }
      }
    }
    return HttpResponse.json({
      id: state.id,
      department: dept,
      priority: priorityOf(state.priority)
    })
  }),

  http.post(api('departments/:id/release/'), async ({ params, request }) => {
    const dept = Number(params.id) as Dept
    const body = await bodyOf<{
      days: { sales_order_id: number; production_date: string }[]
      export_days?: { sales_order_id: number; production_date: string }[]
    }>(request)
    const released: Line[] = []
    const ids = new Set<number>()
    const exported = new Set<number>()
    const run = (days: typeof body.days, isExport: boolean) => {
      for (const day of days) {
        const order = orders.find(row => row.sales_order_id === day.sales_order_id)
        if (!order) continue
        const lot = releaseDay(dept, order, day.production_date, isExport)
        if (lot.length) (isExport ? exported : ids).add(day.sales_order_id)
        released.push(...lot)
      }
    }
    run(body.days, false)
    run(body.export_days ?? [], true)
    if (!released.length) {
      return refuse(`Nothing to release in ${deptName(dept)}.`)
    }
    return HttpResponse.json({
      released: [...ids],
      exported: [...exported],
      cutlists: createCutlists(released)
    })
  }),

  http.patch(api('items/:id/'), async ({ params, request }) => {
    const line = lines.find(row => row.item?.id === Number(params.id))
    if (!line?.item) return notFound()
    const edit = await bodyOf<{
      flow?: number | null
      vented?: boolean
      pull_from_stock?: number
      width?: number
      description?: string
    }>(request)
    Object.assign(line.item, edit)
    // Stock changes what is left to make, and the status follows it.
    refreshLine(line)
    return HttpResponse.json(serializeItem(line))
  })
]
