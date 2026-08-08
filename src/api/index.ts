import ky from 'ky'

import { TokensSchema } from '@/api/auth/schema'
import { sessionStore } from '@/api/auth/session-store'
import { env } from '@/env'
import { singleFlight } from '@/lib/single-flight'

const baseUrl = env.VITE_API_URL

const authClient = ky.create({ baseUrl })

const refreshTokens = singleFlight(async () => {
  const session = sessionStore.get()
  if (!session) throw new Error('No session to refresh')

  try {
    const tokens = await authClient
      .post('auth/refresh', { json: { refreshToken: session.refreshToken } })
      .json()
      .then(data => TokensSchema.parse(data))
    sessionStore.updateTokens(tokens)
    return tokens
  } catch (error) {
    sessionStore.clear()
    throw error
  }
})

export const api = ky.create({
  baseUrl,
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = sessionStore.get()?.accessToken
        if (token) request.headers.set('Authorization', `Bearer ${token}`)
      }
    ],
    afterResponse: [
      async ({ request, response, retryCount }) => {
        if (response.status !== 401 || retryCount > 0) return

        try {
          const tokens = await refreshTokens()
          const headers = new Headers(request.headers)
          headers.set('Authorization', `Bearer ${tokens.accessToken}`)
          return ky.retry({ request: new Request(request, { headers }), code: 'TOKEN_REFRESHED' })
        } catch {}
      }
    ]
  }
})
