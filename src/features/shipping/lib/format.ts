const pounds = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** `1,673.49 lbs`, the way the board prints a weight; `—` when there is none. */
export const formatWeight = (value: number | null) =>
  value === null ? '—' : `${pounds.format(value)} lbs`

/** `13'6" (162")`: the board gives a length in feet and inches, and in inches beside it p3 (595,185). */
export const formatLength = (inches: number | null) => {
  if (!inches) return '—'
  const feet = Math.floor(inches / 12)
  const rest = Math.round((inches - feet * 12) * 10) / 10
  return `${feet}'${rest}" (${inches}")`
}

/** The address on Google Maps — «Click this to view the address on a map» p3 (603,222). */
export const mapUrl = (address: string | null, city: string | null) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [address, city].filter(Boolean).join(', ')
  )}`
