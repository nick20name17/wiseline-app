import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/lib/query-client'

import type { PropsWithChildren } from 'react'

/**
 * Deliberately thin. The template's theme provider, tooltip provider and toaster are all shadcn on
 * Tailwind, and this app renders the prototype's own CSS instead — they would draw unstyled chrome
 * into a document the fidelity gate reads. The prototype's own overlays arrive with the pages.
 *
 * React Query has no callers yet; it is kept because the router's context declares it and because the
 * mock data behind these screens becomes a real API later.
 */
export const Providers = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)
