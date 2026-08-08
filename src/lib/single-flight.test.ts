import { singleFlight } from '@/lib/single-flight'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

it('collapses concurrent calls into a single in-flight invocation', async () => {
  const d = deferred<number>()
  const fn = vi.fn(() => d.promise)
  const wrapped = singleFlight(fn)

  const a = wrapped()
  const b = wrapped()

  expect(fn).toHaveBeenCalledTimes(1)
  expect(a).toBe(b)

  d.resolve(42)
  await expect(a).resolves.toBe(42)
})

it('re-invokes after the previous call settles', async () => {
  const fn = vi.fn(() => Promise.resolve('ok'))
  const wrapped = singleFlight(fn)

  await wrapped()
  await wrapped()

  expect(fn).toHaveBeenCalledTimes(2)
})

it('clears the pending slot on rejection so the next call retries', async () => {
  const fn = vi
    .fn<() => Promise<string>>()
    .mockRejectedValueOnce(new Error('boom'))
    .mockResolvedValueOnce('recovered')
  const wrapped = singleFlight(fn)

  await expect(wrapped()).rejects.toThrow('boom')
  await expect(wrapped()).resolves.toBe('recovered')
  expect(fn).toHaveBeenCalledTimes(2)
})
