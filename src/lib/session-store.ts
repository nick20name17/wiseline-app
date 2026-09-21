import { useSyncExternalStore } from 'react'
import * as z from 'zod/mini'

export const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.nullable(z.string())
})

export type Session = z.infer<typeof sessionSchema>

const STORAGE_KEY = 'session'

const readStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (sessionSchema.safeParse(JSON.parse(stored)).data ?? null) : null
  } catch {
    return null
  }
}

let session = readStorage()
const listeners = new Set<() => void>()

const commit = (next: Session | null) => {
  session = next
  for (const listener of listeners) listener()
}

// Another tab logging in or out must be reflected here, otherwise this tab keeps sending a
// revoked token until the next 401. Attached only while something subscribes, so importing
// the module has no side effects.
const onStorage = (event: StorageEvent) => {
  if (event.key === STORAGE_KEY) commit(readStorage())
}

export const sessionStore = {
  get: () => session,
  set: (next: Session | null) => {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
    commit(next)
  },
  subscribe: (listener: () => void) => {
    const first = listeners.size === 0
    listeners.add(listener)
    if (first) {
      window.addEventListener('storage', onStorage)
      // Nothing was watching until now, so another tab may have changed the session meanwhile.
      commit(readStorage())
    }
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) window.removeEventListener('storage', onStorage)
    }
  }
}

export const useIsAuthenticated = () =>
  useSyncExternalStore(sessionStore.subscribe, () => sessionStore.get() !== null)
