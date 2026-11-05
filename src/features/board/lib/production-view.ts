import { persistedStore } from '@/lib/persisted-store'
import { useSyncExternalStore } from 'react'
import * as z from 'zod/mini'

export const SLINET = 'slinet'

/**
 * The list the worker had open on the Production tab, by id. It outlives the tab and the page, so a
 * worker who steps into Coils, or reloads, comes back to the same rows; it is not in the URL with the
 * station, since a list open is not worth sharing or bookmarking.
 */
const expandedStore = persistedStore('expanded:production', z.number())

export const useProductionView = () => ({
  expanded: useSyncExternalStore(expandedStore.subscribe, expandedStore.get) ?? null
})

// One list open at a time: opening another folds the last, so the page stays the one list at hand.
export const toggleExpanded = (id: number) =>
  expandedStore.set(expandedStore.get() === id ? null : id)
