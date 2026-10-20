import { useRef, type KeyboardEvent } from 'react'

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'

/** The field after `from` in the page's tab order, skipping what is hidden or taken out of it. */
const nextTabbable = (from: Element) => {
  const all = [...document.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    element => element.tabIndex >= 0 && element.getClientRects().length > 0
  )
  const at = all.indexOf(from as HTMLElement)
  return at === -1 ? null : (all[at + 1] ?? null)
}

/**
 * Tab in an open menu picks the highlighted item and moves on to the next field, as Enter would pick
 * it — the floor tabs through a line's fields as it types them, and a menu that only Enter answers
 * breaks that run. Spread onto the menu's popup.
 */
export const useTabSelect = () => {
  const next = useRef<HTMLElement | null>(null)

  return {
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Tab' || event.shiftKey) return
      const item = event.currentTarget.querySelector<HTMLElement>('[data-highlighted]')
      if (!item) return
      // The trigger is what the tab order continues from: the popup sits in a portal outside it.
      const trigger = document.querySelector(`[aria-controls="${event.currentTarget.id}"]`)
      next.current = trigger ? nextTabbable(trigger) : null
      event.preventDefault()
      item.click()
    },
    // Focus goes back to the trigger on any other close, as the menu would have it.
    finalFocus: () => {
      const target = next.current
      next.current = null
      return target ?? true
    }
  }
}
