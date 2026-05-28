import { useEffect } from 'react'

import { getSession } from '@/helpers/auth'

const BASE_WS_URL = 'wss://api.wiseline.app/ws'

interface UseWebsocketSubscriptionProps<T> {
  route: string
  onMessage: (data: T) => void
}

export const useWebsocketSubscription = <T,>({
  route,
  onMessage
}: UseWebsocketSubscriptionProps<T>) => {
  useEffect(() => {
    const session = getSession()

    if (!session) return

    const url = BASE_WS_URL + route

    const websocket = new WebSocket(url, [session.access])

    websocket.onopen = () => {}

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T
        onMessage(data)
      } catch (error) {
        console.error('Failed to parse websocket message', error)
      }
    }

    websocket.onerror = (event) => {
      console.error('Websocket error', event)
    }

    websocket.onclose = (event) => {
      if (!event.wasClean) {
        console.warn('Websocket closed unexpectedly', event)
      }
    }

    return () => {
      websocket.onopen = null
      websocket.onmessage = null
      websocket.onerror = null
      websocket.onclose = null
      websocket.close(1000, 'component unmounted')
    }
  }, [route])
}
