import { useState } from 'react'

/**
 * `value` while a popup is open, and the last one it showed while it closes. The success that closes a
 * popup usually clears what its text is made of, and the fade-out would read «Scheduling 0 orders».
 */
export const useHeldWhileClosed = <T>(value: T, open: boolean) => {
  const [held, setHeld] = useState(value)
  if (open && !Object.is(held, value)) setHeld(value)
  return open ? value : held
}
