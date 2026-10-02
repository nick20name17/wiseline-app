import { expect, test } from 'vitest'
import { DEFAULT_AFTER_LOGIN, safeRedirectPath } from './safe-redirect.ts'

test.each(['/trim', '/a/b?c=1#d'])('keeps in-app path %s', value => {
  expect(safeRedirectPath(value)).toBe(value)
})

test.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'profile', '', 42, undefined])(
  'falls back for %s',
  value => {
    expect(safeRedirectPath(value)).toBe(DEFAULT_AFTER_LOGIN)
  }
)
