import type { User } from '@/api/users/schema'
import { STORAGE_KEYS } from '@/constants/storage'

interface Session {
  access: string
  refresh: string
  user: User
}

export const getSession = (): Session | null => {
  try {
    const sessionStr = localStorage.getItem(STORAGE_KEYS.session)
    return sessionStr ? JSON.parse(sessionStr) : null
  } catch {
    localStorage.removeItem(STORAGE_KEYS.session)
    return null
  }
}

export const setSession = (session: Session) => {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session))
}

export const updateTokens = (tokens: Partial<Pick<Session, 'access' | 'refresh'>>) => {
  const session = getSession()
  if (session) {
    setSession({ ...session, ...tokens })
  }
}

export const clearSession = () => localStorage.removeItem(STORAGE_KEYS.session)

export const isLoggedIn = () => !!getSession()
