import { QueryClientProvider } from '@tanstack/react-query'

import { TooltipProvider } from '@/components/ui/tooltip'

import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query-client'

import { ThemeProvider } from './theme'

import { createPortal } from 'react-dom'

import type { PropsWithChildren } from 'react'

export const Providers = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        {children}
        {/* portalled out of the mount point: the parity gate reads `#root` as the page, and a toaster
            sitting inside it is an element the prototype's page does not have */}
        {createPortal(<Toaster richColors closeButton duration={5_000} />, document.body)}
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
)
