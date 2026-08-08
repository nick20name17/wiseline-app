import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { toast } from 'sonner'

const isClientError = (error: unknown) =>
  error instanceof HTTPError && error.response.status >= 400 && error.response.status < 500

const notifyError = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : 'Something went wrong')

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) notifyError(error)
    }
  }),
  mutationCache: new MutationCache({ onError: notifyError }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => !isClientError(error) && failureCount < 2
    },
    mutations: {
      retry: false
    }
  }
})
