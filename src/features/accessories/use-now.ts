import { useEffect, useState } from 'react'

/** The countdown refreshes on this cadence; a mock does not need one-second precision. */
export const RELEASE_CHECK_MS = 5000

/**
 * The clock, as a value that changes on a tick rather than a call made during render.
 *
 * The prototype re-renders the whole page on a 5-second timer and reads `Date.now()` inline. Doing
 * that here would make the component impure — the React Compiler refuses to memoise anything that
 * calls an impure function while rendering, so the component would silently stop being optimised.
 */
export const useNow = (intervalMs = RELEASE_CHECK_MS) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
