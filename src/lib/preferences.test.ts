import { expect, test, vi } from 'vitest'
import { columnOrderStore, columnWidthStore } from './column-order'
import { loadPreferences } from './preferences'

vi.mock('./session-store', () => ({
  sessionStore: { get: () => ({ accessToken: 'a', refreshToken: 'r' }), subscribe: () => () => {} }
}))

test("a table's order and widths are one preference, each written without the other", async () => {
  const save = vi.fn<(key: string, value: unknown) => Promise<void>>(() => Promise.resolve())
  loadPreferences({ 'table:scheduled': { order: ['b', 'a'] } }, save)

  expect(columnOrderStore('scheduled').get()).toEqual(['b', 'a'])
  columnWidthStore('scheduled').set({ a: 140 })
  columnOrderStore('scheduled').set(null)

  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2))
  expect(save.mock.calls).toEqual([
    ['table:scheduled', { order: ['b', 'a'], widths: { a: 140 } }],
    ['table:scheduled', { widths: { a: 140 } }]
  ])
  expect(columnOrderStore('scheduled').get()).toBeNull()
})

test('a stored value of an older shape reads as nothing', () => {
  loadPreferences({ 'table:wrapping': { order: 'a,b' } }, () => Promise.resolve())
  expect(columnOrderStore('wrapping').get()).toBeNull()
})
