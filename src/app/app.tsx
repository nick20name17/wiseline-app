import { DisabledReasons } from '@/components/disabled-reasons'
import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/lib/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster>
        <DisabledReasons />
        <RouterProvider router={router} />
      </Toaster>
    </TooltipProvider>
  </QueryClientProvider>
)
