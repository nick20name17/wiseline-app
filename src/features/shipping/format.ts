/**
 * Dates are formatted in UTC on purpose. Every date in this app is a plain `YYYY-MM-DD` with no time
 * and no zone — a ship day, not an instant — and reading one in local time moves it a day backwards
 * for anybody west of Greenwich.
 */
const format = (iso: string, options: Intl.DateTimeFormatOptions) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day))
  )
}

/** `Tue, July 14, 2026` — the same long form the other departments use, in far narrower columns. */
export const fmtDate = (iso: string | null) =>
  iso ? format(iso, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : ''
