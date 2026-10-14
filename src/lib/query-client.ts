import { toast } from '@/components/ui/toast'
import { getErrorMessage } from '@/lib/errors'
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { HTTPError, NetworkError, TimeoutError } from 'ky'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      skipErrorToast?: boolean
      // A function when what did not happen depends on why: a refusal reads differently from no answer.
      errorTitle?: string | ((error: unknown) => string)
    }
    queryMeta: { skipErrorToast?: boolean }
  }
}

const MAX_RETRIES = 2
const MAX_RETRY_DELAY_MS = 30_000
const STALE_TIME_MS = 60_000
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])

export const shouldRetry = (failureCount: number, error: unknown) => {
  if (failureCount >= MAX_RETRIES) return false

  if (error instanceof HTTPError) {
    return RETRYABLE_STATUSES.has(error.response.status)
  }

  return error instanceof TimeoutError || error instanceof NetworkError
}

export const retryDelay = (attempt: number, error: unknown) => {
  if (error instanceof HTTPError) {
    const retryAfter = Number(error.response.headers.get('Retry-After'))
    if (retryAfter > 0) {
      return Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS)
    }
  }
  return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS)
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Every failed mutation is toasted here, including those whose callers also react in their own
      // `onError` (a revert, say). A hook names what did not happen with `errorTitle`, and the server's
      // reason goes under it; only a caller that says something else entirely sets `skipErrorToast`.
      const meta = mutation.meta
      if (meta?.skipErrorToast) return
      const title =
        typeof meta?.errorTitle === 'function' ? meta.errorTitle(error) : meta?.errorTitle
      toast.add(
        title
          ? { type: 'error', title, description: getErrorMessage(error) }
          : { type: 'error', title: getErrorMessage(error) }
      )
    }
  }),
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.skipErrorToast || query.state.data === undefined) return
      toast.add({ type: 'error', title: getErrorMessage(error) })
    }
  }),
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      retry: shouldRetry,
      retryDelay,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: false
    }
  }
})
