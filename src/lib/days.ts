/**
 * A production day is a plain `YYYY-MM-DD` with no time and no zone. Reading one in local time moves
 * it a day backwards for anybody west of Greenwich, so every date here is formatted in UTC.
 */
const format = (iso: string, options: Intl.DateTimeFormatOptions) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day))
  )
}

/** `Tue, May 7, 2024` — wherever a date stands on its own. */
export const formatDate = (iso: string | null) =>
  iso ? format(iso, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'

/** `Tue, July 14, 2026` — the board's confirmations spell the month out. */
export const formatLongDate = (iso: string) =>
  format(iso, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })

/** `Tue, May 7` — for the day strip, where every day is obviously this year. */
export const formatDayLabel = (iso: string) =>
  format(iso, { weekday: 'short', month: 'short', day: 'numeric' })

/** The day the board opens on, in the same `YYYY-MM-DD` shape the API speaks. */
export const toIsoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const today = () => toIsoDay(new Date())

/** `YYYY-MM-DD` back to a `Date` at local midnight, which is what react-day-picker selects on. */
export const fromIsoDay = (iso: string) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}
