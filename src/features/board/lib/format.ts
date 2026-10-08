import type { CapacityUnit, DayStripEntry } from '../api'
/**
 * `Tue, July 14, 2026 · 2:41 PM` — an instant rather than a production day (`@/lib/days`), so it is
 * read in local time: it records when somebody on the floor pressed a button.
 */
export const formatStamp = (iso: string) => {
  const at = new Date(iso)
  const day = at.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  return `${day} · ${at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export const formatCount = (value: number) => numbers.format(value)

/** A product's colour and gauge the way the cards and their labels print them. */
export const productFacts = (product: { color: string | null; gauge: string | null }) =>
  [product.color, product.gauge === null ? null : `${product.gauge} ga`].filter(Boolean).join(' · ')

const UNITS: Record<CapacityUnit, { short: string; long: string }> = {
  // The board prints Trim's as bare figures, «2710 / 5000» p1 (251,486).
  bends: { short: '', long: 'bends' },
  linear_feet: { short: ' ft', long: 'linear feet' },
  pieces: { short: ' pcs', long: 'pieces' }
}

/** What a day's load is counted in, for the words around the figure. */
export const loadUnit = (unit: CapacityUnit) => UNITS[unit].long

// Feet come back to the hundredth; a pill wants whole numbers, ungrouped like the board's.
const whole = (value: number) => String(Math.round(value))

/**
 * A day's load as its pill prints it: what is on the day against its capacity, in the department's
 * unit p1 (81,286), p2 (731,390), p3 (1078,280); the figure alone where the day has no ceiling.
 */
export const dayLoad = (entry: DayStripEntry) => {
  const { short } = UNITS[entry.capacity_unit]
  // A bare figure needs the slash to read as a load: Trim with no Daily Max reads «21 / —».
  if (entry.capacity === null)
    return short ? `${whole(entry.used)}${short}` : `${whole(entry.used)} / —`
  return `${whole(entry.used)} / ${whole(entry.capacity)}${short}`
}

/** A day's load in a sentence, for a hint: against the capacity where the day has one. */
export const dayLoadHint = (entry: DayStripEntry) =>
  `${formatCount(entry.used)}${entry.capacity === null ? '' : ` of ${formatCount(entry.capacity)}`} ${loadUnit(entry.capacity_unit)} scheduled${entry.over_capacity ? ' — over the daily capacity' : ''}`
