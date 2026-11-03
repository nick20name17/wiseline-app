import { useEffect } from 'react'

// A table's own sideways scroll makes its box a scroll container, so `position: sticky` on its header
// would stick within that box, which never scrolls down. The header is moved down by hand instead,
// as far as the bars stuck above it (`data-sticky-edge`) reach into the table, and no further than the
// table's last row. Tables inside a row's details or in a dialog scroll with what holds them.
const HEADS = "[data-slot='table-container'] > table > thead:not(td *, [role='dialog'] *)"

const place = () => {
  const edge = Math.max(
    0,
    ...Array.from(
      document.querySelectorAll('[data-sticky-edge]'),
      bar => bar.getBoundingClientRect().bottom
    )
  )
  for (const head of document.querySelectorAll<HTMLElement>(HEADS)) {
    const table = head.parentElement!.getBoundingClientRect()
    const shift = Math.min(Math.max(0, edge - table.top), table.height - head.offsetHeight)
    if (shift > 0) {
      head.style.transform = `translateY(${shift}px)`
      head.dataset.stuck = ''
    } else if (head.dataset.stuck !== undefined) {
      head.style.transform = ''
      delete head.dataset.stuck
    }
  }
}

/** Keeps every page table's header row in view while its rows scroll under the bars above it. */
export const useStickyTableHeads = () => {
  useEffect(() => {
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(place)
    }
    // Rows that load or open move a table without a scroll.
    const resized = new ResizeObserver(schedule)
    resized.observe(document.body)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      resized.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])
}
