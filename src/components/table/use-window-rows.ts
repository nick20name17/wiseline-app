import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useLayoutEffect, useRef, useState } from 'react'

// A collapsed board row. Expanded rows are measured, so this only has to be near for the first paint.
const ROW_ESTIMATE = 37

/**
 * Renders only the rows of a long table that are on screen, while the page — not the table — keeps
 * scrolling: the window is the scroll element, and the table's distance from the top of the page is
 * the margin the virtualizer counts from.
 *
 * Each item is meant to be its own `<tbody>` carrying `data-index` and `measure` as its ref, so a row
 * that opens into line items is measured whole; `SpacerRows` stands in for the rows above and below.
 */
export const useWindowRows = (count: number, keyOf: (index: number) => string) => {
  // The virtualizer is one object that changes inside; the React Compiler would memoise what is read
  // off it and freeze the rows on screen.
  'use no memo'
  const tableRef = useRef<HTMLTableElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  // What sits above the table — a toolbar, the day strip — changes height as it loads and moves the
  // table down the page, so the margin follows the page's layout rather than being read once.
  useLayoutEffect(() => {
    const read = () =>
      setScrollMargin((tableRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY)
    read()
    const observer = new ResizeObserver(read)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [])

  const virtualizer = useWindowVirtualizer({
    count,
    estimateSize: () => ROW_ESTIMATE,
    getItemKey: keyOf,
    overscan: 12,
    scrollMargin
  })

  const items = virtualizer.getVirtualItems()
  const first = items[0]
  const last = items.at(-1)

  return {
    tableRef,
    items,
    measure: virtualizer.measureElement,
    before: first ? first.start - scrollMargin : 0,
    after: last ? virtualizer.getTotalSize() - (last.end - scrollMargin) : 0
  }
}
