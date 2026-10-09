import { HTTPError } from 'ky'
import { expect, test } from 'vitest'
import { retryDelay, shouldRetry } from './query-client.ts'

const httpError = (status: number, headers: HeadersInit = {}) =>
  new HTTPError(
    new Response(null, { status, headers }),
    new Request('http://api.test/'),
    {} as never
  )

test.each([408, 429, 500, 503])('retries status %i', status => {
  expect(shouldRetry(0, httpError(status))).toBe(true)
})

test.each([400, 401, 403, 404, 422])('does not retry status %i', status => {
  expect(shouldRetry(0, httpError(status))).toBe(false)
})

test('stops after the retry budget', () => {
  expect(shouldRetry(2, httpError(500))).toBe(false)
})

test('backs off exponentially', () => {
  expect(retryDelay(0, new Error('x'))).toBe(1000)
  expect(retryDelay(1, new Error('x'))).toBe(2000)
})

test('honours Retry-After, capped', () => {
  expect(retryDelay(0, httpError(429, { 'Retry-After': '5' }))).toBe(5000)
  expect(retryDelay(0, httpError(429, { 'Retry-After': '600' }))).toBe(30_000)
})

// Retry-After may legally be an HTTP date, which Number() turns into NaN.
test('ignores an unparseable Retry-After', () => {
  expect(retryDelay(0, httpError(429, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }))).toBe(
    1000
  )
})
