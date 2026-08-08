import { useSyncExternalStore } from 'react'

import { viewerStore } from './viewer'

export const useViewer = () => useSyncExternalStore(viewerStore.subscribe, viewerStore.get)
