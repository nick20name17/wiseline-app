import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'

import { mocksEnabled } from '@/env'
import { Providers } from '@/providers'
import { router } from '@/router'

import '@/index.css'

if (mocksEnabled) {
  const { installMockServer } = await import('@/mocks/mock-server')
  installMockServer()
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root not found')

createRoot(rootEl).render(
  <Providers>
    <RouterProvider router={router} />
  </Providers>
)
