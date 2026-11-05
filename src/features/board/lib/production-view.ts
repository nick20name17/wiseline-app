import { useSyncExternalStore } from 'react'

export const SLINET = 'slinet'

type ProductionView = {
  /** `SLINET`, a machine's id, or the wrapping station. */
  station: string
  done: boolean
  /** The list folded open, by id — a worker who steps into Coils comes back to the same rows. */
  expanded: number | null
}

/**
 * Where the worker was standing on the Production tab. It outlives the tab itself, so switching to
 * another tab and back does not drop him on the Slinet with every list folded; it is not in the URL
 * because none of it is worth sharing or bookmarking.
 */
let view: ProductionView = { station: SLINET, done: false, expanded: null }
const listeners = new Set<() => void>()

const set = (patch: Partial<ProductionView>) => {
  view = { ...view, ...patch }
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useProductionView = () => useSyncExternalStore(subscribe, () => view)

export const setStation = (station: string) => set({ station })

export const setDone = (done: boolean) => set({ done })

// One list open at a time: opening another folds the last, so the page stays the one list at hand.
export const toggleExpanded = (id: number) => set({ expanded: view.expanded === id ? null : id })
