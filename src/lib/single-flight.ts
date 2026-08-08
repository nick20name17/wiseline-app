export const singleFlight = <T>(fn: () => Promise<T>): (() => Promise<T>) => {
  let pending: Promise<T> | null = null
  return () => {
    pending ??= fn().finally(() => {
      pending = null
    })
    return pending
  }
}
