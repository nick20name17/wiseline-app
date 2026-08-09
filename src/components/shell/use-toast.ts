import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export type ToastState = {
  message: string
  type: ToastType
  shown: boolean
}

/**
 * The toast the scan screens raise after every action.
 *
 * It is wired rather than stubbed because it is visible, and the gate only compares what is on screen:
 * a toast that never shows is three `data-comment` values the port has and the prototype's baseline
 * does not. `hideMs` matches the prototype page by page — 2200 on the scan tools, 2600 elsewhere.
 */
export const useToast = (hideMs = 2200) => {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', shown: false })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), [])

  const show = useCallback(
    (message: string, type: ToastType = 'success') => {
      setToast({ message, type, shown: true })
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setToast(current => ({ ...current, shown: false })), hideMs)
    },
    [hideMs]
  )

  return { toast, show }
}
