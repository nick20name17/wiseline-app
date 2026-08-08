import { afterAll, afterEach, beforeAll } from 'vitest'

import { fetchMe, login, logout } from '@/api/auth'
import { sessionStore } from '@/api/auth/session-store'
import { installMockServer } from '@/mocks/mock-server'

const creds = { email: 'demo@example.com', password: 'demo1234' }

let uninstall: () => void

beforeAll(() => {
  uninstall = installMockServer()
})
afterAll(() => uninstall())
afterEach(() => {
  sessionStore.clear()
  localStorage.clear()
})

it('logs in and persists the session', async () => {
  const session = await login(creds)
  expect(session.user.email).toBe(creds.email)
  expect(sessionStore.get()?.user.email).toBe(creds.email)
})

it('rejects bad credentials without touching the session', async () => {
  await expect(login({ ...creds, password: 'wrong' })).rejects.toThrow()
  expect(sessionStore.get()).toBeNull()
})

it('transparently refreshes when the access token is rejected', async () => {
  await login(creds)
  const session = sessionStore.get()!
  sessionStore.set({ ...session, accessToken: 'expired' })

  const me = await fetchMe()

  expect(me.email).toBe(creds.email)
  expect(sessionStore.get()?.accessToken).not.toBe('expired')
})

it('clears the session on logout', async () => {
  await login(creds)
  await logout()
  expect(sessionStore.get()).toBeNull()
})
