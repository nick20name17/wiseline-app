import { useSyncExternalStore } from 'react'
import * as z from 'zod/mini'
import { persistedStore } from './persisted-store'

const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
})

export type Session = z.infer<typeof sessionSchema>

// Another tab logging in or out must be reflected here, otherwise this tab keeps sending a revoked
// token until the next 401.
export const sessionStore = persistedStore('session', sessionSchema)

export const useIsAuthenticated = () =>
  useSyncExternalStore(sessionStore.subscribe, () => sessionStore.get() !== null)
