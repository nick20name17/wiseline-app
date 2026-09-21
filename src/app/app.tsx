import { ThemeProvider } from '@/components/theme/theme-provider'
import { Toaster } from '@/components/ui/toast'
import { queryClient } from '@/lib/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

export const App = () => (
  <ThemeProvider defaultTheme='system' storageKey='theme'>
    <QueryClientProvider client={queryClient}>
      <Toaster>
        <RouterProvider router={router} />
      </Toaster>
    </QueryClientProvider>
  </ThemeProvider>
)
