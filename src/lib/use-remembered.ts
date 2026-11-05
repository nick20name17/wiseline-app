import { useSyncExternalStore } from 'react'
import type * as z from 'zod/mini'
import { persistedStore, type PersistedStore } from './persisted-store'

// One store per key for the life of the page, so every component reading a key sees the same value.
const stores = new Map<string, PersistedStore<unknown>>()

const storeFor = <T>(key: string, schema: z.ZodMiniType<T>) => {
  let store = stores.get(key)
  if (!store) {
    store = persistedStore(key, schema) as PersistedStore<unknown>
    stores.set(key, store)
  }
  return store as PersistedStore<T>
}

/**
 * `useState` that this browser remembers across reloads, as which rows a list had open. `initial` is
 * what an unremembered or unreadable value reads as.
 */
export const useRemembered = <T>(key: string, schema: z.ZodMiniType<T>, initial: T) => {
  const store = storeFor(key, schema)
  const value = useSyncExternalStore(store.subscribe, store.get) ?? initial
  const set = (next: T | ((current: T) => T)) =>
    store.set(next instanceof Function ? next(store.get() ?? initial) : next)
  return [value, set] as const
}
