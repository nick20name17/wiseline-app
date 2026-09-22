import { departmentStateOf, type TrimLineItem, type TrimOrder } from '../api'

/**
 * A part is one production day of one order — the row the Scheduled tab shows. A split order is one
 * part per day it has work on, and each is worked, locked and moved on its own.
 */

/** The app's own row carries the day once the line is scheduled; the mirror only echoes it. */
export const lineDay = (item: TrimLineItem) =>
  item.item?.production_date ?? item.production_date ?? null

/** What still has to be made: the ordered quantity less whatever is being pulled from stock. */
export const toMake = (item: TrimLineItem) => item.quantity - (item.item?.pull_from_stock ?? 0)

/**
 * How an order's lines are spread over production days: some on a day and some still on none
 * (`partial`), on more than one day (`split`), or all together (`null`). Which of the two it is
 * decides where the rest of the order is to be found.
 */
export const splitOf = (order: TrimOrder) => {
  const days = order.origin_items.map(lineDay)
  if (days.some(day => !day) && days.some(day => day)) return 'partial'
  return new Set(days).size > 1 ? 'split' : null
}

/**
 * Every day the order has lines on, earliest first. An order whose lines carry no day of their own
 * sits wholly on the department's production date.
 */
export const partDays = (order: TrimOrder, departmentId: number | undefined): string[] => {
  const days = new Set(order.origin_items.map(lineDay).filter((day): day is string => !!day))
  if (!days.size) {
    const whole = departmentStateOf(order, departmentId)?.production_date
    if (whole) days.add(whole)
  }
  return [...days].sort()
}

/** The lines one part moves with; an order with no per-line days moves whole. */
export const partLines = (order: TrimOrder, day: string) => {
  const dated = order.origin_items.some(item => lineDay(item))
  return dated ? order.origin_items.filter(item => lineDay(item) === day) : order.origin_items
}

export const partKey = (orderId: string, day: string) => `${orderId}|${day}`
