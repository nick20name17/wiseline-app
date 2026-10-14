import { useState, useSyncExternalStore } from 'react'

const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    onChange => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )

/** A phone: the sidebar is a sheet and a dialog rises from the bottom as a drawer. Tailwind's `md`. */
export const useIsMobile = () => useMediaQuery('(width < 48rem)')

/** Wide enough for the full sidebar beside a board's tables. Tailwind's `xl`. */
export const useIsWide = () => useMediaQuery('(width >= 80rem)')

/**
 * Drawer or centred, as the screen is when the dialog opens, and kept until it shuts: the two are
 * different components, so switching while open — a phone turned sideways crosses `md` — would
 * remount the dialog and lose whatever was typed into it.
 */
export const useDrawer = (open: boolean) => {
  const mobile = useIsMobile()
  const [drawer, setDrawer] = useState(mobile)
  if (!open && drawer !== mobile) setDrawer(mobile)
  return drawer
}
