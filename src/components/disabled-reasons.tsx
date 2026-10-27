import { toast } from '@/components/ui/toast'
import { useEffect } from 'react'

const DISABLED = '[title]:is(:disabled, [data-disabled], [aria-disabled="true"])'

/** The disabled control under a tap, if one is. */
const tappedControl = (x: number, y: number) => {
  const top = document.elementFromPoint(x, y)
  if (!top) return null
  // A disabled checkbox or menu item still takes the tap itself, its tick or icon included.
  const own = top.closest<HTMLElement>(DISABLED)
  if (own) return own
  // A disabled button takes no pointer events, so the tap lands on what holds it and is matched to
  // it by where it landed — never through a dialog's backdrop, which holds nothing of the page.
  return (
    [...top.querySelectorAll<HTMLElement>(DISABLED)].find(control => {
      const box = control.getBoundingClientRect()
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
    }) ?? null
  )
}

/**
 * A disabled control says why in its title, which shows on hover and never under a finger: a tap on
 * one shows the title instead.
 */
export const DisabledReasons = () => {
  useEffect(() => {
    // A finger that scrolls ends in pointercancel, so a pointerup is a tap.
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return
      const control = tappedControl(event.clientX, event.clientY)
      // Keyed by the reason, a second tap refreshes the toast rather than stacking another.
      if (control?.title) toast.add({ id: control.title, title: control.title })
    }
    document.addEventListener('pointerup', onPointerUp)
    return () => document.removeEventListener('pointerup', onPointerUp)
  }, [])
  return null
}
