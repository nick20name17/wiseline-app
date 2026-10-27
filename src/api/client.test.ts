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

test('a 500 hides the raw exception', async () => {
  fetchMock.mockImplementation(async () =>
    json({ detail: '(sqlalchemy.dialects.postgresql.asyncpg.IntegrityError) null value' }, 500)
  )

  const error = await authApi.get('broken').catch((caught: unknown) => caught)
  expect(error).toBeInstanceOf(HTTPError)
  expect((error as HTTPError).message).not.toContain('sqlalchemy')
})

test('a 502 keeps what EBMS said', async () => {
  fetchMock.mockImplementation(async () => json({ detail: 'EBMS refused the batch.' }, 502))

  const error = await authApi.get('ebms').catch((caught: unknown) => caught)
  expect((error as HTTPError).message).toBe('EBMS refused the batch.')
})

test.each([
  [
    'two refused fields',
    { detail: [{ msg: 'Width is required.' }, { msg: 'Length is required.' }] },
    'Width is required. Length is required.'
  ],
  ['a field-keyed detail', { detail: { width: 'Too wide.', code: 7 } }, 'Too wide.'],
  ['an errors list', { errors: ['No such coil.', 'Try again.'] }, 'No such coil. Try again.'],
  ['a message', { message: 'Locked by another user.' }, 'Locked by another user.'],
  ['an empty detail', { detail: '', message: 'Fallback.' }, 'Fallback.'],
  [
    'a 422 with no sentences',
    { detail: [{ loc: ['body'] }, null] },
    'Request failed with status 400'
  ],
  ['an empty message', { message: '' }, 'Request failed with status 400']
])('a 400 reads %s', async (_, body, message) => {
  fetchMock.mockImplementation(async () => json(body, 400))

  const error = await authApi.get('refused').catch((caught: unknown) => caught)
  expect((error as HTTPError).message).toBe(message)
})

test('a 400 with no JSON at all reads as its status', async () => {
  fetchMock.mockImplementation(async () => new Response('Bad Request', { status: 400 }))

  const error = await authApi.get('refused').catch((caught: unknown) => caught)
  expect((error as HTTPError).message).toBe('Request failed with status 400')
})

test('sends the access token on every request', async () => {
  sessionStore.set(REFRESHED)
  await authApi.get('anything').json()
  expect(requests()[0]?.headers.get('Authorization')).toBe(`Bearer ${REFRESHED.accessToken}`)
})

test('a 403 is not refreshed', async () => {
  fetchMock.mockImplementation(async () => json({ detail: 'Forbidden.' }, 403))

  await expect(authApi.get('locked').json()).rejects.toThrow('Forbidden.')
  expect(requests().some(isRefresh)).toBe(false)
})

test('refreshes with the refresh token it holds', async () => {
  const bodies: Promise<unknown>[] = []
  fetchMock.mockImplementation(async input => {
    bodies.push((input as Request).clone().text())
    return server(input as Request)
  })

  await authApi.get('anything').json()
  const refresh = requests().findIndex(isRefresh)
  expect(JSON.parse((await bodies[refresh]) as string)).toEqual({ refresh: SESSION.refreshToken })
})
