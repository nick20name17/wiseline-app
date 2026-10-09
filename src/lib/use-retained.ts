import { useState } from 'react'

/**
 * A dialog opened for an item closes when the item goes `null`, but its popup stays on screen for the
 * exit animation — reading the item directly would empty it for those frames. This keeps the last
 * item until `release`, which belongs on the dialog's `onOpenChangeComplete`; releasing, rather than
 * keeping it forever, lets queries keyed on the item go idle once the dialog is gone.
 *
 * `value` must keep its identity while it is the same item, or every render stores it anew.
 */
export const useRetained = <T>(value: T | null) => {
  const [kept, setKept] = useState(value)
  if (value !== null && value !== kept) setKept(value)
  const release = (open: boolean) => {
    if (!open) setKept(null)
  }
  return [value ?? kept, release] as const
}
