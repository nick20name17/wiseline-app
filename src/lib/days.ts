/**
 * A production day is a plain `YYYY-MM-DD` with no time and no zone. Reading one in local time moves
 * it a day backwards for anybody west of Greenwich, so every date here is formatted in UTC.
 */
const utc = (options: Intl.DateTimeFormatOptions) =>
  // Built once: constructing a formatter costs about a hundred times what formatting with one does,
  // and the Scheduled tab formats a date per row.
  new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' })

const format = (iso: string, formatter: Intl.DateTimeFormat) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return formatter.format(new Date(Date.UTC(year, month - 1, day)))
}

const DATE = utc({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const LONG_DATE = utc({ weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
const DAY_LABEL = utc({ weekday: 'short', month: 'short', day: 'numeric' })
const STAMP = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

/** `Tue, May 7, 2024` — wherever a date stands on its own. */
export const formatDate = (iso: string | null) => (iso ? format(iso, DATE) : '—')

/** `Tue, July 14, 2026` — the board's confirmations spell the month out. */
export const formatLongDate = (iso: string) => format(iso, LONG_DATE)

/** `May 7, 2026, 3:04 PM` — a moment something happened, in the viewer's own zone. */
export const formatStamp = (iso: string | null) => (iso ? STAMP.format(new Date(iso)) : '')

/** `Tue, May 7` — for the day strip, where every day is obviously this year. */
export const formatDayLabel = (iso: string) => format(iso, DAY_LABEL)

/** The day the board opens on, in the same `YYYY-MM-DD` shape the API speaks. */
export const toIsoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const today = () => toIsoDay(new Date())

/** `YYYY-MM-DD` back to a `Date` at local midnight, which is what react-day-picker selects on. */
export const fromIsoDay = (iso: string) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Items that arrive sorted by day, cut into a run per day. The lists come in the board's order, so a
 * day ends where the date changes.
 */
export const byDay = <T, D extends string | null>(items: readonly T[], dateOf: (item: T) => D) => {
  const days: { date: D; items: T[] }[] = []
  for (const item of items) {
    const last = days[days.length - 1]
    const date = dateOf(item)
    if (last && last.date === date) last.items.push(item)
    else days.push({ date, items: [item] })
  }
  return days
}
