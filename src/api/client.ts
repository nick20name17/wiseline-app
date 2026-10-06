import { env } from '@/lib/env'
import { sessionStore, type Session } from '@/lib/session-store'
import ky, { HTTPError, type Options } from 'ky'
import * as z from 'zod/mini'

const refreshSchema = z.object({
  access: z.string(),
  refresh: z.string()
})

const getServerMessage = (data: unknown) => {
  if (typeof data !== 'object' || data === null) return undefined
  const { detail, errors, message } = data as {
    detail?: unknown
    errors?: unknown
    message?: unknown
  }
  if (typeof detail === 'string' && detail) return detail
  // FastAPI's 422 lists every field it refused, each with its own sentence.
  if (Array.isArray(detail)) {
    const messages = detail.flatMap(issue =>
      typeof issue?.msg === 'string' ? [issue.msg as string] : []
    )
    if (messages.length) return messages.join(' ')
  }
  if (typeof detail === 'object' && detail !== null) {
    const fields = Object.values(detail).filter(value => typeof value === 'string')
    if (fields.length) return fields.join(' ')
  }
  if (Array.isArray(errors) && typeof errors[0] === 'string') return errors.join(' ')
  if (typeof message === 'string' && message) return message
  return undefined
}

const BASE_OPTIONS: Options = {
  baseUrl: env.VITE_API_URL,
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

// Concurrent 401s share one refresh: each response rotates the refresh token, so parallel calls would
// race to spend the same one.
let refreshing: Promise<Session | null> | undefined

const refresh = (refreshToken: string) =>
  (refreshing ??= publicApi
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
    .finally(() => {
      refreshing = undefined
    }))

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
        const refreshed = await refresh(session.refreshToken)
        if (!refreshed) return response
        request.headers.set('Authorization', `Bearer ${refreshed.accessToken}`)
        return ky.retry({ request })
      }
    ]
  }
})
