import { expect, test, vi } from 'vitest'
import { singleFlight } from './single-flight.ts'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

test('concurrent calls with the same key share one run', async () => {
  const gate = deferred<string>()
  const fn = vi.fn<() => Promise<string>>(() => gate.promise)
  const flight = singleFlight(fn)

  const both = Promise.all([flight('k'), flight('k')])
  gate.resolve('value')

  expect(await both).toStrictEqual(['value', 'value'])
  expect(fn).toHaveBeenCalledTimes(1)
})

test('different keys run independently', async () => {
  const fn = vi.fn<(key: string) => Promise<string>>(async key => key)
  const flight = singleFlight(fn)

  await Promise.all([flight('a'), flight('b')])

  expect(fn).toHaveBeenCalledTimes(2)
})

test('a settled call is not reused', async () => {
  const fn = vi.fn<(key: string) => Promise<string>>(async key => key)
  const flight = singleFlight(fn)

  await flight('k')
  await flight('k')

  expect(fn).toHaveBeenCalledTimes(2)
})

test('a rejected call is not reused', async () => {
  const fn = vi.fn<() => Promise<never>>(async () => {
    throw new Error('boom')
  })
  const flight = singleFlight(fn)

  await expect(flight('k')).rejects.toThrow('boom')
  await expect(flight('k')).rejects.toThrow('boom')
  expect(fn).toHaveBeenCalledTimes(2)
})
