import { sessionStore } from '@/lib/session-store'
import { network } from './browser'
import { reviewSession } from './handlers/auth'

export const startMocks = () => {
  network.enable()
  // A reviewer opens the boards, not the sign-in form; signing out still shows it.
  if (!sessionStore.get()) sessionStore.set(reviewSession)
}
