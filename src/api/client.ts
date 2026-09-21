import { sessionStore } from '@/lib/session-store'
import { env } from '@/lib/env'
import { singleFlight } from '@/lib/single-flight'
import ky, { HTTPError, type Options } from 'ky'
import * as z from 'zod/mini'

const BASE_URL = env.VITE_API_URL

const refreshSchema = z.object({
  access: z.string(),
  refresh: z.string()
})

// FastAPI reports failures as `detail`, either a string or a field map; ErrorResponse uses `errors`.
const getServerMessage = (data: unknown) => {
  if (typeof data !== 'object' || data === null) return undefined
  const { detail, errors, message } = data as {
    detail?: unknown
    errors?: unknown
    message?: unknown
  }
  if (typeof detail === 'string' && detail) return detail
  if (Array.isArray(errors) && typeof errors[0] === 'string') return errors.join(' ')
  if (typeof message === 'string' && message) return message
  return undefined
}

const BASE_OPTIONS: Options = {
  baseUrl: BASE_URL,
  retry: { limit: 1, methods: [], statusCodes: [] },
  hooks: {
    beforeError: [
      ({ error }) => {
        if (error instanceof HTTPError) {
          error.message =
            getServerMessage(error.data) ?? `Request failed with status ${error.response.status}`
        }
        return error
      }
    ]
  }
}

export const publicApi = ky.create(BASE_OPTIONS)

const refresh = singleFlight((refreshToken: string) =>
  publicApi
    .post('token/refresh/', { json: { refresh: refreshToken } })
    .json()
    .then(body => {
      const { access, refresh } = refreshSchema.parse(body)
      const refreshed = { accessToken: access, refreshToken: refresh }
      sessionStore.set(refreshed)
      return refreshed
    })
    .catch(() => {
      sessionStore.set(null)
      return null
    })
)

export const authApi = publicApi.extend({
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const session = sessionStore.get()
        if (session) request.headers.set('Authorization', `Bearer ${session.accessToken}`)
      }
    ],
    afterResponse: [
      async ({ request, response, retryCount }) => {
        const session = sessionStore.get()
        if (response.status !== 401 || retryCount > 0 || !session) return response
        // The login response may carry no refresh token, in which case a 401 is terminal.
        if (!session.refreshToken) {
          sessionStore.set(null)
          return response
        }
        const refreshed = await refresh(session.refreshToken)
        if (!refreshed) return response
        request.headers.set('Authorization', `Bearer ${refreshed.accessToken}`)
        return ky.retry({ request })
      }
    ]
  }
})
