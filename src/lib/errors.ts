import { HTTPError, NetworkError, TimeoutError } from 'ky'

export const getErrorMessage = (error: unknown) => {
  if (error instanceof HTTPError) return error.message
  if (error instanceof TimeoutError) return 'The server is not responding. Please try again later.'
  // A server error sent without CORS headers reaches the browser as a network failure too, so the
  // connection is only blamed when the browser itself says it is offline.
  if (error instanceof NetworkError)
    return navigator.onLine
      ? 'The server did not answer. Please try again.'
      : 'No internet connection.'
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Please try again.'
}
