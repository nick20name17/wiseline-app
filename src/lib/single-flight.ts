export const singleFlight = <K, T>(fn: (key: K) => Promise<T>): ((key: K) => Promise<T>) => {
  const pending = new Map<K, Promise<T>>()
  return key => {
    let flight = pending.get(key)
    if (!flight) {
      flight = fn(key).finally(() => pending.delete(key))
      pending.set(key, flight)
    }
    return flight
  }
}
