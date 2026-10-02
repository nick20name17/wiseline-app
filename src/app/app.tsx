import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/lib/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

// The review build has no backend: its requests are answered in the page, from the moment it
// starts. Imported on demand, so a normal build ships none of it.
if (import.meta.env.VITE_REVIEW) (await import('@/mocks/start')).startMocks()

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster>
        <RouterProvider router={router} />
      </Toaster>
    </TooltipProvider>
  </QueryClientProvider>
)
