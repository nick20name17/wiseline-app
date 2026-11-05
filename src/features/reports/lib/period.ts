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
