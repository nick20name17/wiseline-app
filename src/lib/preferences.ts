import { toast } from '@/components/ui/toast'
import type * as z from 'zod/mini'
import type { PersistedStore } from './persisted-store'
import { sessionStore } from './session-store'

type Save = (key: string, value: unknown) => Promise<unknown>

// The signed-in user's, by key; `null` until the server's are in. The server keeps them per user, so
// they follow the person to another browser, and it never reads them: their shape is ours.
let values: Record<string, unknown> | null = null
let save: Save | undefined
const listeners = new Set<() => void>()
// One key's writes reach the server in the order they were made, so the last one is what it keeps.
const queues = new Map<string, Promise<unknown>>()

const notify = () => {
  for (const listener of listeners) listener()
}

/** Whether this user's preferences are in: they are read once, when the app opens. */
export const preferencesLoaded = () => values !== null

/** The server's preferences, read when the app opens, and how a change is sent back. */
export const loadPreferences = (all: Record<string, unknown>, saveToServer: Save) => {
  values = all
  save = saveToServer
  notify()
  // Signed out, or the session lost: the next user's are not this one's.
  const unsubscribe = sessionStore.subscribe(() => {
    if (sessionStore.get()) return
    unsubscribe()
    values = null
    queues.clear()
    notify()
  })
}

/**
 * One preference, readable through `useSyncExternalStore`. A value that no longer fits the schema — an
 * older shape — reads as nothing rather than as a crash.
 */
export const preferenceStore = <T>(key: string, schema: z.ZodMiniType<T>): PersistedStore<T> => {
  // Parsed once per stored value, so `get` returns the same object until the value changes.
  let raw: unknown
  let parsed: T | null = null
  const get = () => {
    const stored = values?.[key] ?? null
    if (stored !== raw) {
      raw = stored
      parsed = stored === null ? null : (schema.safeParse(stored).data ?? null)
    }
    return parsed
  }

  return {
    get,
    set: next => {
      if (values === null || !save) return
      values = { ...values, [key]: next }
      notify()
      const send = save
      const queued = (queues.get(key) ?? Promise.resolve())
        .then(() => send(key, next))
        .catch(() => {
          toast.add({ type: 'error', title: 'This setting was not saved' })
        })
      queues.set(key, queued)
    },
    subscribe: listener => {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    }
  }
}
