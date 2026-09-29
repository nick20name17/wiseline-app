import { departmentStateOf, isNarrowed, type BoardLineItem, type BoardOrder } from '../api'

/**
 * A part is one production day of one order — the row the Scheduled tab shows. A split order is one
 * part per day it has work on, and each is worked, locked and moved on its own.
 */

/**
 * The app's own row carries the day once the line is scheduled. The mirror's `production_date` is the
 * order's earliest day in the department, not the line's — on a split order it dates the lines still
 * waiting too — so it is never read as the line's own.
 */
export const lineDay = (item: BoardLineItem) => item.item?.production_date ?? null

/** What still has to be made: the ordered quantity less whatever is being pulled from stock. */
export const toMake = (item: BoardLineItem) => item.quantity - (item.item?.pull_from_stock ?? 0)

/**
 * How an order's lines are spread over production days: some on a day and some still on none
 * (`partial`), on more than one day (`split`), or all together (`null`). Which of the two it is
 * decides where the rest of the order is to be found.
 */
export const splitOf = (order: BoardOrder) => {
  if (isNarrowed(order)) return 'partial'
  const days = order.origin_items.map(lineDay)
  if (days.some(day => !day) && days.some(day => day)) return 'partial'
  return new Set(days).size > 1 ? 'split' : null
}

/**
 * Every day the order has lines on, earliest first. An order whose lines carry no day of their own
 * sits wholly on the department's production date.
 */
export const partDays = (order: BoardOrder, departmentId: number | undefined): string[] => {
  const days = new Set(order.origin_items.map(lineDay).filter((day): day is string => !!day))
  if (!days.size) {
    const whole = departmentStateOf(order, departmentId)?.production_date
    if (whole) days.add(whole)
  }
  return [...days].sort()
}

/** The lines one part moves with; an order with no per-line days moves whole. */
export const partLines = (order: BoardOrder, day: string) => {
  const dated = order.origin_items.some(item => lineDay(item))
  return dated ? order.origin_items.filter(item => lineDay(item) === day) : order.origin_items
}

export const partKey = (orderId: string, day: string) => `${orderId}|${day}`

/**
 * Where one part stands: Reviewed when every one of its lines is, Released once any is. The lines carry
 * both for their own day; an order whose lines have no app row yet falls back on the order's.
 */
export const partState = (order: BoardOrder, day: string, departmentId: number | undefined) => {
  const items = partLines(order, day).flatMap(line => (line.item ? [line.item] : []))
  if (!items.length) {
    const state = departmentStateOf(order, departmentId)
    return { reviewed: state?.reviewed ?? false, released: state?.release_to_production ?? false }
  }
  return {
    reviewed: items.every(item => item.reviewed),
    released: items.some(item => item.is_released)
  }
}

/** Rollforming's line order: «sorted by Product ID and then by Length» p2 (573,411), (571,303). */
export const byProduct = (a: BoardLineItem, b: BoardLineItem) =>
  (a.id_inven ?? '').localeCompare(b.id_inven ?? '') || (a.length ?? 0) - (b.length ?? 0)

/** Where a sorted list needs «a distinct line between the different Product IDs» p2 (544,416). */
export const newProduct = (rows: BoardLineItem[], index: number) =>
  index > 0 && rows[index - 1]!.id_inven !== rows[index]!.id_inven

/**
 * Every material on the order, gauge and colour, as the Gauge / Color column lists them p2 (573,283). The
 * list hands over only the lines its tab holds, so a split order shows only what is left on it
 * p2 (601,345).
 */
export const materialsOf = (order: BoardOrder) => [
  ...new Set(
    order.origin_items.flatMap(item => {
      const color = item.color?.trim()
      if (!color && !item.gauge) return []
      return [[item.gauge ? `${item.gauge} Ga` : null, color].filter(Boolean).join(' ')]
    })
  )
]
