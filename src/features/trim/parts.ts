import type { LineItem, Order } from './types'

/**
 * A part is one production day of one order — the row the Scheduled tab shows under a day tab.
 *
 * #6: «After splitting an order, each part needs to act as a completely separate order.» Review and
 * release are therefore recorded per day rather than once for the whole order: the day the Manager is
 * looking at is reviewed, released and gated on its own, and the other half of a split order is
 * neither blocked by it nor carried along with it.
 *
 * These are pure functions over an order, in their own module because the store needs them too and
 * `selectors.ts` reads the store — importing selectors from the store would close a cycle.
 */

/**
 * The production day of a single line (#172). Only a split order carries per-line dates; a plain
 * order's lines all follow the order's own date. `null` means still unscheduled.
 */
export const lineDay = (order: Order, item: LineItem) =>
  item.scheduledDate || (order.isSplit ? null : order.productionDate)

export const partDays = (order: Order): string[] => {
  const days = new Set<string>()
  for (const item of order.lineItems) {
    const day = lineDay(order, item)
    if (day) days.add(day)
  }
  return [...days].sort()
}

/** With a day: that part. Without: the whole order, which is every part it has. */
export const isReviewed = (order: Order, day?: string | null) => {
  if (day) return order.reviewedDays.includes(day)
  const days = partDays(order)
  return days.length > 0 && days.every(candidate => order.reviewedDays.includes(candidate))
}

export const isReleased = (order: Order, day?: string | null) => {
  if (day) return order.releasedDays.includes(day)
  const days = partDays(order)
  return days.length > 0 && days.every(candidate => order.releasedDays.includes(candidate))
}

/** A line is on the floor once *its own* day has been released. */
export const lineReleased = (order: Order, item: LineItem) =>
  isReleased(order, lineDay(order, item))

/** Selection for release is per part, so it is keyed by both — see `TrimState.releaseIds`. */
export const partKey = (orderId: number, day: string) => `${orderId}|${day}`

export const parsePartKey = (key: string) => {
  const [id, day] = key.split('|')
  return { orderId: Number(id), day: day ?? '' }
}
