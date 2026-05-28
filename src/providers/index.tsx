import type { PropsWithChildren } from 'react'

import { ReactQueryProvider } from './react-query'
import { TooltipProvider } from '@/components/ui/tooltip'

export const Providers = ({ children }: PropsWithChildren) => {
  return (
    <ReactQueryProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </ReactQueryProvider>
  )
}
