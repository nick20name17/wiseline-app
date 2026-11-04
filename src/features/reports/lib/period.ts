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

/**
 * The remakes list takes moments, not days, and its upper end is open: up to the midnight that ends
 * the last day, so a remake asked for late on it still counts.
 */
export const remakePeriod = ({ from, to }: Period) => ({
  created_at__gte: `${from}T00:00:00`,
  created_at__lt: `${nextDay(to)}T00:00:00`
})
