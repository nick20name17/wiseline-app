import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/lib/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

// The review build has no backend: a worker answers the requests the app makes, and has to be
// listening before the first one. Imported on demand, so a normal build ships none of it.
if (import.meta.env.VITE_MOCK) {
  const { worker } = await import('@/mocks/browser')
  await worker.start({
    quiet: true,
    // Only an API call with no handler is a gap in the mock; the app's own pages and assets are not.
    onUnhandledFrame: ({ frame, defaults }) => {
      const { request } = frame.data as { request?: Request }
      if (request?.url.startsWith(import.meta.env.VITE_API_URL)) defaults.warn()
    }
  })
}

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster>
        <RouterProvider router={router} />
      </Toaster>
    </TooltipProvider>
  </QueryClientProvider>
)
