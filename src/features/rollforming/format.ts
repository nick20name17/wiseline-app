/**
 * Dates are formatted in UTC on purpose. Every date in this app is a plain `YYYY-MM-DD` with no time
 * and no zone — a production day, not an instant — and reading one in local time moves it a day
 * backwards for anybody west of Greenwich.
 */
const format = (iso: string, options: Intl.DateTimeFormatOptions) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day))
  )
}

/** `Wed, July 15, 2026` — the long form, used wherever a date stands on its own. */
export const fmtDate = (iso: string | null) =>
  iso ? format(iso, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : ''

/** A completion stamp is a real instant, so its time is read in local time and the date is not. */
export const fmtDateTime = (iso: string | null) =>
  iso
    ? `${fmtDate(iso.slice(0, 10))}, ${new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}`
    : ''
