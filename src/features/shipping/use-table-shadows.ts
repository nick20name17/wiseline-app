import { useEffect } from 'react'

/**
 * The edge scroll-shadows on Shipping's tables: a fade at whichever side has more table to scroll, so a
 * horizontally-scrollable table reads as "scroll for more" rather than "cut off".
 *
 * It is measured, not derived, so it has to run after the DOM exists — and it runs after *every* render
 * with no dependency list, mirroring the `requestAnimationFrame(wlUpdTableShadows)` the prototype ends
 * every render with. Gating it on a dependency would leave the fade describing the previous table: a row
 * expanding is enough to change whether one is there.
 *
 * The classes go on the DOM node rather than through React state deliberately. They are a fact about
 * layout that only the browser knows, and writing them back into state to re-render would measure the
 * layout that the re-render then replaces.
 */
export const useTableShadows = () => {
  useEffect(() => {
    const update = () => {
      for (const wrap of document.querySelectorAll('.table-wrap')) {
        const scroller = wrap.querySelector('.table-scroll')
        if (!scroller) continue

        const max = scroller.scrollWidth - scroller.clientWidth
        wrap.classList.toggle('can-scroll-l', scroller.scrollLeft > 1)
        wrap.classList.toggle('can-scroll-r', max > 1 && scroller.scrollLeft < max - 1)
      }
    }

    const frame = requestAnimationFrame(update)

    // capture phase: a scroll inside the table does not bubble, and the listener is on the document
    const onScroll = (event: Event) => {
      if ((event.target as HTMLElement | null)?.classList?.contains('table-scroll')) update()
    }

    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', update)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', update)
    }
  })
}
