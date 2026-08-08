import type { PropsWithChildren } from 'react'

import { TooltipProvider } from '@/components/ui/tooltip'

import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './theme'

export const Providers = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          {children}
          <Toaster richColors closeButton duration={5_000} />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
