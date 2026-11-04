/** The days a report covers, both ends included, as `YYYY-MM-DD`. */
export type Period = { from: string; to: string }

/** The 1st of the month a day is in. */
export const monthStart = (day: string) => `${day.slice(0, 8)}01`

/**
 * The period a link asks for: this month so far when it names neither end, and the two ends the
 * right way round when it names them backwards. `YYYY-MM-DD` sorts as text does.
 */
export const periodOf = (from: string | undefined, to: string | undefined, now: string): Period => {
  const end = to ?? now
  const start = from ?? monthStart(end)
  return start <= end ? { from: start, to: end } : { from: end, to: start }
}

const nextDay = (day: string) => {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

// The server's TIME_ZONE: the report's days are the shop's, wherever the manager reads them from.
const SHOP_TIME_ZONE = 'America/New_York'

const shopClock = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
})

/** How far the shop's clock is ahead of UTC at a moment, in ms (negative: behind). */
const shopOffset = (at: number) => {
  const part = Object.fromEntries(
    shopClock.formatToParts(at).map(({ type, value }) => [type, Number(value)])
  )
  return (
    Date.UTC(part.year!, part.month! - 1, part.day!, part.hour!, part.minute!, part.second!) - at
  )
}

/**
 * The moment a day starts at the shop. Its offset is read at that midnight, not the UTC one: the
 * clocks change at 2:00 there, so the two can sit either side of a change.
 */
const shopMidnight = (day: string) => {
  const utc = Date.parse(`${day}T00:00:00Z`)
  return new Date(utc - shopOffset(utc - shopOffset(utc))).toISOString()
}

/**
 * The remakes list takes moments, not days, and its upper end is open: up to the midnight that ends
 * the last day, so a remake asked for late on it still counts. Both midnights are the shop's, as the
 * summary's days are.
 */
export const remakePeriod = ({ from, to }: Period) => ({
  created_at__gte: shopMidnight(from),
  created_at__lt: shopMidnight(nextDay(to))
})
