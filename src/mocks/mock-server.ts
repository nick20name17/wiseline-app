/**
 * Throwaway in-memory backend for local dev. Patches global `fetch` for `/api/*`.
 *
 * TO REMOVE: delete `src/mocks/`, drop the `mocksEnabled` block in `src/main.tsx`,
 * and remove `VITE_ENABLE_MOCKS` from `src/env.ts`.
 *
 * Seed login — email: demo@example.com  password: demo1234
 */

const LATENCY_MS = 300
const ACCESS_TTL_MS = 15 * 60 * 1000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const nonce = () => Math.random().toString(36).slice(2)

type MockUser = { id: string; email: string; password: string }

const users = new Map<string, MockUser>([
  ['demo@example.com', { id: 'u_demo', email: 'demo@example.com', password: 'demo1234' }]
])

const validRefreshTokens = new Set<string>()

const issueAccess = (userId: string) => `mock.access.${userId}.${Date.now() + ACCESS_TTL_MS}`

const issueRefresh = (userId: string) => {
  const token = `mock.refresh.${userId}.${nonce()}`
  validRefreshTokens.add(token)
  return token
}

const userIdFromAccess = (token: string | null): string | null => {
  const [kind, sub, userId, exp] = token?.split('.') ?? []
  if (kind !== 'mock' || sub !== 'access' || !userId) return null
  return Number(exp) > Date.now() ? userId : null
}

const publicUser = (user: MockUser) => ({ id: user.id, email: user.email })

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  })

type MockRequest = { method: string; path: string; bearer: string | null; body: unknown }

const handle = async ({ method, path, bearer, body }: MockRequest): Promise<Response> => {
  const route = `${method} ${path}`

  switch (route) {
    case 'POST /api/auth/login': {
      const { email, password } = (body ?? {}) as Partial<MockUser>
      const user = email ? users.get(email) : undefined
      if (!user || user.password !== password) return json({ message: 'Invalid credentials' }, 401)
      return json({
        user: publicUser(user),
        accessToken: issueAccess(user.id),
        refreshToken: issueRefresh(user.id)
      })
    }

    case 'POST /api/auth/refresh': {
      const { refreshToken } = (body ?? {}) as { refreshToken?: string }
      const [kind, sub, userId] = refreshToken?.split('.') ?? []
      if (kind !== 'mock' || sub !== 'refresh' || !userId || !validRefreshTokens.has(refreshToken!))
        return json({ message: 'Invalid refresh token' }, 401)

      validRefreshTokens.delete(refreshToken!)
      return json({ accessToken: issueAccess(userId), refreshToken: issueRefresh(userId) })
    }

    case 'POST /api/auth/logout': {
      const userId = userIdFromAccess(bearer)
      if (userId) {
        for (const t of validRefreshTokens)
          if (t.startsWith(`mock.refresh.${userId}.`)) validRefreshTokens.delete(t)
      }
      return new Response(null, { status: 204 })
    }

    case 'GET /api/auth/me': {
      const userId = userIdFromAccess(bearer)
      const user = [...users.values()].find(u => u.id === userId)
      if (!user) return json({ message: 'Unauthorized' }, 401)
      return json(publicUser(user))
    }

    default:
      return json({ message: `No mock handler for ${route}` }, 404)
  }
}

// clone-based reads leave the caller's original Request untouched, so ky can still retry it
const normalize = async (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  path: string
): Promise<MockRequest> => {
  const request = input instanceof Request ? input : null
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()
  const headers = new Headers(init?.headers ?? request?.headers)

  let raw: string | null = null
  if (typeof init?.body === 'string') raw = init.body
  else if (request)
    raw = await request
      .clone()
      .text()
      .catch(() => null)

  return {
    method,
    path,
    bearer: headers.get('authorization')?.replace('Bearer ', '') ?? null,
    body: raw ? JSON.parse(raw) : null
  }
}

export const installMockServer = () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input, init) => {
    const href = input instanceof Request ? input.url : input instanceof URL ? input.href : input
    if (!href.includes('/api/')) return originalFetch(input, init)

    const { pathname } = new URL(href, globalThis.location?.origin ?? 'http://localhost')
    if (!pathname.startsWith('/api/')) return originalFetch(input, init)

    await sleep(LATENCY_MS)
    return handle(await normalize(input, init, pathname))
  }

  console.info('[mock-server] active — login demo@example.com / demo1234')

  return () => {
    globalThis.fetch = originalFetch
  }
}
