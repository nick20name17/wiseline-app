/**
 * Dates are formatted in UTC on purpose. Every date in this app is a plain `YYYY-MM-DD` with no time
 * and no zone — a prep day, not an instant — and reading one in local time moves it a day backwards
 * for anybody west of Greenwich.
 */
export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)))
}
