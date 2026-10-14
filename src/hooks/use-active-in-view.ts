import { useEffect, useRef } from 'react'

/**
 * Brings a scrolling tab strip's `[data-active]` tab into it whenever `active` changes — a phone's
 * strip shows a few tabs at a time, and the open one may have been opened from elsewhere.
 */
export const useActiveInView = <T extends HTMLElement>(active: unknown) => {
  const ref = useRef<T>(null)
  useEffect(() => {
    const strip = ref.current
    if (!strip) return
    // Only the strip moves: `scrollIntoView` would scroll the window to it as well.
    const reveal = () => {
      const tab = strip.querySelector('[data-active]')
      if (!tab) return
      // A `scrollport` strip pads its edges for the focus ring; the tab stops inside that padding.
      const { paddingLeft, paddingRight } = getComputedStyle(strip)
      const box = strip.getBoundingClientRect()
      const start = box.left + parseFloat(paddingLeft)
      const end = box.right - parseFloat(paddingRight)
      const { left, right } = tab.getBoundingClientRect()
      if (left < start) strip.scrollLeft -= start - left
      else if (right > end) strip.scrollLeft += right - end
    }
    reveal()
    // Tabs widen as their counts or names arrive, and the strip narrows beside its neighbours.
    const observer = new ResizeObserver(reveal)
    observer.observe(strip)
    for (const child of strip.children) observer.observe(child)
    // Tabs mark the new active one after the render that changed it, so the first look can still
    // find the old one.
    const marks = new MutationObserver(reveal)
    marks.observe(strip, { subtree: true, attributeFilter: ['data-active'] })
    return () => {
      observer.disconnect()
      marks.disconnect()
    }
  }, [active])
  return ref
}
