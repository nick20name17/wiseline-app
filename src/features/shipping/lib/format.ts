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

// Street and town alone match places anywhere — Google sends «3464 Concession 3, Harrow» to wherever
// the viewer is — so the province, postal code and country go along whenever EBMS has them.
type Place = {
  address: string | null
  city: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
}

// EBMS pads its text fields with spaces, so a blank one would otherwise add an empty part.
const placeOf = ({ address, city, state, zip, country }: Place) =>
  [address, city, state, zip, country]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(', ')

/** The address on Google Maps — «Click this to view the address on a map» p3 (603,222). */
export const mapUrl = (place: Place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeOf(place))}`

/**
 * The run on Google Maps, stop by stop from the warehouse — «shows that route on the map» p3 (617,441).
 * A directions link needs no API key; the map drawn in the page waits on one. `null` under two stops.
 */
export const routeUrl = (stops: Place[]) => {
  const places = stops.map(placeOf).filter(Boolean)
  if (places.length < 2) return null
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('origin', places[0]!)
  url.searchParams.set('destination', places[places.length - 1]!)
  if (places.length > 2) url.searchParams.set('waypoints', places.slice(1, -1).join('|'))
  return url.toString()
}
