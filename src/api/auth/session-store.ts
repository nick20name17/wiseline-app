import { SessionSchema, type Session, type Tokens } from '@/api/auth/schema'

const KEY = 'session'

type Listener = (session: Session | null) => void

const parseRaw = (raw: string | null): Session | null => {
  try {
    return raw ? SessionSchema.parse(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

let current = parseRaw(localStorage.getItem(KEY))
const listeners = new Set<Listener>()

const notify = () => listeners.forEach(l => l(current))

const commit = (next: Session | null) => {
  current = next
  if (next) localStorage.setItem(KEY, JSON.stringify(next))
  else localStorage.removeItem(KEY)
  notify()
}

window.addEventListener('storage', e => {
  if (e.key !== KEY) return
  current = parseRaw(e.newValue)
  notify()
})

export const sessionStore = {
  get: () => current,
  set: (next: Session) => commit(next),
  clear: () => commit(null),
  updateTokens: (tokens: Tokens) => {
    if (!current) throw new Error('Cannot update tokens: no active session')
    commit({ ...current, ...tokens })
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
}
