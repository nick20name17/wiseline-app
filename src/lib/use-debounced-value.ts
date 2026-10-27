import { useEffect, useState } from 'react'

/** `value` once it has held still for `ms` — what a search box asks the server for. */
export const useDebouncedValue = <T>(value: T, ms: number) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])

  return debounced
}
