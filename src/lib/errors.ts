import { HTTPError, NetworkError, TimeoutError } from 'ky'

const FALLBACK = 'Something went wrong. Please try again.'

export const isNetworkError = (error: unknown) => error instanceof NetworkError

export const getErrorMessage = (error: unknown) => {
  if (error instanceof HTTPError) return error.message
  if (error instanceof TimeoutError) return 'The server is not responding. Please try again later.'
  if (isNetworkError(error)) return 'No internet connection.'
  if (error instanceof Error && error.message) return error.message
  return FALLBACK
}
