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
