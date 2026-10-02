import { sessionStore } from '@/lib/session-store'
import { network } from './browser'
import { reviewSession } from './handlers/auth'

/** A reviewer opens the boards, never the sign-in form. */
export const signInForReview = () => sessionStore.set(reviewSession)

export const startMocks = () => {
  network.enable()
  if (!sessionStore.get()) signInForReview()
}
