import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { defineNetwork, InterceptorSource } from 'msw/experimental'
import { env } from '@/lib/env'
import { handlers } from './handlers'

/**
 * The page's own `fetch`, intercepted in place rather than through a service worker: the hub serves
 * a build under `/a/:versionId/` and then rewrites the URL to the app's own path, which leaves the
 * page outside any worker's scope.
 */
export const network = defineNetwork({
  sources: [new InterceptorSource({ interceptors: [new FetchInterceptor()] })],
  handlers,
  // Only an API call with no handler is a gap in the mock; anything else goes out as it is.
  onUnhandledFrame: ({ frame, defaults }) => {
    const { request } = frame.data as { request?: Request }
    if (request?.url.startsWith(env.VITE_API_URL)) defaults.warn()
  }
})
