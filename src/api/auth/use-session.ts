import { useSyncExternalStore } from 'react'

import { sessionStore } from '@/api/auth/session-store'

export const useSession = () => useSyncExternalStore(sessionStore.subscribe, sessionStore.get)
