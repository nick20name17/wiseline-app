import type * as z from 'zod'

/**
 * A value the prototype keeps in `localStorage` under a `wl_` key, and the only way this app touches
 * one.
 *
 * These keys are the prototype's cross-page contracts: Trim reads the coil a Rollforming screen wrote,
 * Settings publishes machine capacities every department reads, Shipping's scan state decides a
 * countdown in the warehouse grid. Each page was a separate document, so `localStorage` was the only
 * channel they had. The port is a single document and could pass this in memory — but the keys stay,
 * because the prototype's own reload behaviour is written in terms of them, a browser that has used
 * the demo keeps its state, and the two can be run side by side while the port is finished.
 *
 * Everything read back is validated: a key can hold whatever an older build of the prototype left
 * there, and a shape that no longer parses is treated as absent rather than trusted.
 */
export type Persisted<T> = {
  get: () => T
  set: (value: T) => void
  subscribe: (listener: () => void) => () => void
}

type Options<T, Stored> = {
  key: string
  schema: z.ZodType<Stored>
  fallback: () => T
  /** Stored shape → the shape callers want. Runs only on a value that parsed. */
  decode: (stored: Stored) => T
  encode: (value: T) => Stored
}

export const persisted = <T, Stored>({
  key,
  schema,
  fallback,
  decode,
  encode
}: Options<T, Stored>): Persisted<T> => {
  const read = (): T => {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback()

    try {
      const parsed = schema.safeParse(JSON.parse(raw))
      return parsed.success ? decode(parsed.data) : fallback()
    } catch {
      return fallback()
    }
  }

  let current = read()
  const listeners = new Set<() => void>()

  // a write from another tab — or from the HTML prototype in one — is as real as a write from here
  window.addEventListener('storage', event => {
    if (event.key !== key) return
    current = read()
    listeners.forEach(listener => listener())
  })

  return {
    get: () => current,
    set: value => {
      current = value
      try {
        localStorage.setItem(key, JSON.stringify(encode(value)))
      } catch {
        // a full or blocked store is not worth failing a render over; the value is still in memory
      }
      listeners.forEach(listener => listener())
    },
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
