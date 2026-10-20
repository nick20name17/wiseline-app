import { useState } from 'react'

/**
 * `value` while a popup is open, and the last one it showed while it closes. The success that closes a
 * popup usually clears what its text is made of, and the fade-out would read «Scheduling 0 orders».
 * A value built afresh on every render needs `equal`, or holding it would re-render without end.
 */
export const useHeldWhileClosed = <T>(
  value: T,
  open: boolean,
  equal: (a: T, b: T) => boolean = Object.is
) => {
  const [held, setHeld] = useState(value)
  if (open && !equal(held, value)) setHeld(value)
  return open ? value : held
}
