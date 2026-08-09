import { arrivalKey, forgetOccupant, releaseStamps } from '@/store/shared/locations'

import { createStore } from '@/store/create-store'

import seed from './seed.json'

export type Occupant = {
  order: string
  dept: string
  weight: number
  status: string
}

export type Location = {
  id: number
  name: string
  type: string
  warehouse: string
  maxWeight: number
  /** 1 is a single-order location: occupied means unavailable. Above 1 it is a Multi-Order location. */
  maxOrders: number
  occupants: Occupant[]
}

export type WarehouseState = {
  activeWarehouse: string
  activeTypes: string[]
  search: string
  selectedLocationId: number | null
  locations: Location[]
}

/** Colour and label together drive the legend, the tile dot and the capacity bar. */
export const TYPES = [
  { key: 'Wrapping', color: 'var(--accent)' },
  { key: 'Loading', color: 'var(--warn)' },
  { key: 'Stock', color: 'var(--success)' },
  { key: 'Staging', color: 'var(--text-muted)' }
]

/**
 * The seed is the prototype's own `store.get()`, with each occupant's `lastScanAt` dropped: the
 * prototype stamps it with `Date.now()` on load, so dumping it would have frozen one particular
 * afternoon into the repo. Only the location detail modal reads it, and that is not ported yet.
 */
export const warehouseStore = createStore<WarehouseState>(seed as unknown as WarehouseState)

export const setSearch = (search: string) => warehouseStore.set({ search })

export const setWarehouse = (activeWarehouse: string) => warehouseStore.set({ activeWarehouse })

export const toggleType = (type: string) =>
  warehouseStore.set(state => ({
    activeTypes: state.activeTypes.includes(type)
      ? state.activeTypes.filter(current => current !== type)
      : [...state.activeTypes, type]
  }))

export const fmtN = (n: number) => n.toLocaleString('en-US')

export const typeColor = (type: string) =>
  TYPES.find(entry => entry.key === type)?.color ?? 'var(--text-muted)'

export const occCurrent = (location: Location) =>
  location.occupants.reduce((total, occupant) => total + occupant.weight, 0)

export const occPct = (location: Location) =>
  location.maxWeight ? Math.round((occCurrent(location) / location.maxWeight) * 100) : 0

export const isOver = (location: Location) => occCurrent(location) > location.maxWeight

export const orderCap = (location: Location) => location.maxOrders || 1

export const orderCount = (location: Location) => location.occupants.length

/** Unavailable at its order capacity *or* over its weight — either one closes the location. */
export const isFull = (location: Location) =>
  orderCount(location) >= orderCap(location) || isOver(location)

export const barColor = (location: Location) =>
  isOver(location) ? 'var(--danger)' : occPct(location) >= 70 ? 'var(--warn)' : 'var(--success)'

export const filteredLocations = (state: WarehouseState) => {
  const query = state.search.trim().toLowerCase()

  return state.locations.filter(location => {
    if (state.activeWarehouse !== 'All' && location.warehouse !== state.activeWarehouse)
      return false
    if (state.activeTypes.length && !state.activeTypes.includes(location.type)) return false
    if (query && !location.name.toLowerCase().includes(query)) return false
    return true
  })
}

/* -- the 15-minute auto-release --------------------------------------------------------------- */

export const AUTO_RELEASE_MS = 15 * 60 * 1000
export const RELEASE_CHECK_MS = 5000

const stamps = releaseStamps('wh')

/**
 * When each occupant was last scanned, which is what the countdown counts from.
 *
 * It is stamped on first sight and kept in `localStorage`, so the fifteen minutes are real elapsed
 * time and survive a reload — a countdown that restarted on every refresh would never release
 * anything. The seed deliberately carries no timestamp: it would freeze one particular afternoon into
 * the repo, and the first load is the honest moment to start counting from.
 */
export const lastScanAt = (locationId: number, order: string) => {
  const key = arrivalKey(locationId, order)
  const known = stamps.get()[key]
  if (typeof known === 'number' && isFinite(known)) return known

  const now = Date.now()
  stamps.set({ ...stamps.get(), [key]: now })
  return now
}

export const fmtCountdown = (msLeft: number) => {
  const total = Math.max(0, Math.ceil(msLeft / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export const isMulti = (location: Location) => orderCap(location) > 1

export const selectLocation = (selectedLocationId: number | null) =>
  warehouseStore.set({ selectedLocationId })

export const removeOccupant = (locationId: number, index: number) => {
  const location = warehouseStore.get().locations.find(entry => entry.id === locationId)
  const removed = location?.occupants[index]

  warehouseStore.set(state => ({
    locations: state.locations.map(entry =>
      entry.id !== locationId
        ? entry
        : { ...entry, occupants: entry.occupants.filter((_, at) => at !== index) }
    )
  }))

  if (removed) forgetOccupant('wh', locationId, removed.order)
}

/** Locations whose last scan is older than the window; the caller releases them and says so. */
export const dueForRelease = (state: WarehouseState) =>
  state.locations.flatMap(location =>
    location.occupants
      .filter(occupant => Date.now() - lastScanAt(location.id, occupant.order) >= AUTO_RELEASE_MS)
      .map(occupant => ({ location, order: occupant.order }))
  )

export const releaseOrder = (locationId: number, order: string) => {
  warehouseStore.set(state => ({
    locations: state.locations.map(entry =>
      entry.id !== locationId
        ? entry
        : { ...entry, occupants: entry.occupants.filter(occupant => occupant.order !== order) }
    )
  }))
  forgetOccupant('wh', locationId, order)
}

export const STATUS_CLASS: Record<string, string> = {
  Wrapped: 'st-wrapped',
  'Ready to Ship': 'st-inprogress',
  Stock: 'st-stock',
  Staged: 'st-stock'
}
