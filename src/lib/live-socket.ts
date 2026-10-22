import { env } from './env'
import { sessionStore } from './session-store'

const MAX_RETRY_DELAY_MS = 30_000

/**
 * A channel the server pushes to, held open while someone is signed in. The access token goes in the
 * subprotocol, the only header a browser lets a WebSocket set. A dropped connection is opened again,
 * waiting longer each time; the server sends its current state on every connect, so nothing missed in
 * between is lost. Returns what closes it for good.
 */
export const openLiveSocket = (path: string, onMessage: (message: unknown) => void) => {
  const url = new URL(path, env.VITE_API_URL)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

  let socket: WebSocket | undefined
  let retry: ReturnType<typeof setTimeout> | undefined
  let attempt = 0

  const close = () => {
    clearTimeout(retry)
    const open = socket
    // Cleared first, so its close is not taken for a dropped connection.
    socket = undefined
    open?.close()
  }

  const connect = () => {
    close()
    const token = sessionStore.get()?.accessToken
    if (!token) return
    const current = new WebSocket(url, [token])
    socket = current
    current.addEventListener('open', () => {
      attempt = 0
    })
    current.addEventListener('message', event => {
      try {
        onMessage(JSON.parse(String(event.data)))
      } catch {
        // Not JSON: nothing this app sent for.
      }
    })
    // A refused token closes it too; by the retry, a request will have refreshed the token.
    current.addEventListener('close', () => {
      if (socket !== current) return
      retry = setTimeout(connect, Math.min(1000 * 2 ** attempt++, MAX_RETRY_DELAY_MS))
    })
  }

  // A token refresh leaves an open socket alone; signing out closes it, signing in opens it.
  const unsubscribe = sessionStore.subscribe(() => {
    const signedIn = sessionStore.get() !== null
    if (!signedIn) close()
    else if (!socket) connect()
  })
  connect()

  return () => {
    unsubscribe()
    close()
  }
}
