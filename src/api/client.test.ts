import { sessionStore } from '@/lib/session-store'
import { HTTPError } from 'ky'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { authApi } from './client.ts'

const SESSION = { accessToken: 'old', refreshToken: 'r1' }
const REFRESHED = { accessToken: 'new', refreshToken: 'r2' }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const fetchMock = vi.fn<typeof fetch>()

const isRefresh = (request: Request) => new URL(request.url).pathname === '/token/refresh/'

const server = async (request: Request) => {
  if (isRefresh(request))
    return json({ access: REFRESHED.accessToken, refresh: REFRESHED.refreshToken })
  if (request.headers.get('Authorization') !== `Bearer ${REFRESHED.accessToken}`) {
    return json({ detail: 'expired' }, 401)
  }
  return json({ echoed: await request.text() })
}

const requests = () => fetchMock.mock.calls.map(([input]) => input as Request)

beforeEach(() => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  })
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockImplementation(input => server(input as Request))
  sessionStore.set(SESSION)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

test('401 refreshes once and replays the request with its body', async () => {
  const result = await authApi.post('items', { json: { name: 'x' } }).json()

  expect(result).toStrictEqual({ echoed: '{"name":"x"}' })
  expect(sessionStore.get()).toStrictEqual(REFRESHED)
  expect(requests().filter(isRefresh)).toHaveLength(1)
  expect(requests().at(-1)?.headers.get('Authorization')).toBe(`Bearer ${REFRESHED.accessToken}`)
})

test('concurrent 401s share one refresh', async () => {
  await Promise.all([authApi.get('a').json(), authApi.get('b').json()])

  expect(requests().filter(isRefresh)).toHaveLength(1)
})

test('failed refresh clears the session and surfaces the 401', async () => {
  fetchMock.mockImplementation(async () => json({}, 401))

  await expect(authApi.get('a').json()).rejects.toBeInstanceOf(HTTPError)
  expect(sessionStore.get()).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('401 without a session is not refreshed', async () => {
  sessionStore.set(null)

  await expect(authApi.get('a').json()).rejects.toBeInstanceOf(HTTPError)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test("a 422 reads as FastAPI's sentences", async () => {
  fetchMock.mockImplementation(async () =>
    json(
      {
        detail: [
          { loc: ['body', 'core_od'], msg: 'Input should be less than or equal to 60', type: 'x' }
        ]
      },
      422
    )
  )

  await expect(authApi.post('coils/lots/1/apply/').json()).rejects.toThrow(
    'Input should be less than or equal to 60'
  )
})
