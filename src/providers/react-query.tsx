import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
  type QueryKey
} from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/helpers/error-message'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      invalidatesQuery?: QueryKey
      successMessage?: string
      errorMessage?: string
      showErrorMessage?: boolean
    }
  }
}

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError(error, _, __, mutation) {
      if (mutation.meta?.showErrorMessage !== false) {
        const errorMessage = getErrorMessage(error)
        toast.error(mutation.meta?.errorMessage ? mutation.meta.errorMessage : errorMessage)
      }
    },
    onSuccess(_, __, ___, mutation) {
      const message = mutation.meta?.successMessage
      if (message) {
        toast.success(message)
      }
    },
    onSettled(_, __, ___, ____, mutation) {
      const queryKey = mutation.options.meta?.invalidatesQuery
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey })
      }
    }
  }),
  defaultOptions: {
    queries: {
      retry: 0,
      staleTime: 1000 * 60 * 5
    },
    mutations: {
      retry: 0
    }
  }
})

export const ReactQueryProvider = ({ children }: PropsWithChildren) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
