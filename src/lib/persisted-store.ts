import type * as z from 'zod/mini'

export type PersistedStore<T> = {
  get: () => T | null
  /** `null` forgets the value. */
  set: (next: T | null) => void
  subscribe: (listener: () => void) => () => void
}

/**
 * A value kept in this browser's localStorage, readable through `useSyncExternalStore`. Anything that
 * no longer fits the schema — an older shape, a hand edit — reads as nothing rather than as a crash.
 */
export const persistedStore = <T>(key: string, schema: z.ZodMiniType<T>): PersistedStore<T> => {
  const read = (): T | null => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? (schema.safeParse(JSON.parse(stored)).data ?? null) : null
    } catch {
      return null
    }
  }

  let value = read()
  const listeners = new Set<() => void>()
  const commit = (next: T | null) => {
    value = next
    for (const listener of listeners) listener()
  }
  // A change in another tab is reflected here, instead of being overwritten by this tab's next write.
  // Attached only while something subscribes, so creating a store has no side effects.
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) commit(read())
  }

  return {
    get: () => value,
    set: next => {
      if (next === null) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(next))
      commit(next)
    },
    subscribe: listener => {
      const first = listeners.size === 0
      listeners.add(listener)
      if (first) {
        window.addEventListener('storage', onStorage)
        // Nothing was watching until now, so another tab may have written meanwhile.
        commit(read())
      }
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) window.removeEventListener('storage', onStorage)
      }
    }
  }
}
