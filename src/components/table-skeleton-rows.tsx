import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'
import { useLayoutEffect, useRef, useState } from 'react'

// A body row is as tall as the header row; both come from ui/table.tsx.
const ROW_HEIGHT = 35

// What renders before the measurement below replaces it, in the same layout pass.
const INITIAL_ROWS = 5

// Keeps the card off the bottom edge of the window.
const BOTTOM_GUTTER = 24

type TableSkeletonRowsProps = {
  /** The last column holds a row's buttons, which its placeholder is shaped like. */
  actions?: boolean
}

/**
 * Placeholder rows that fill the window below the table and stop there, so a slow list never
 * grows a scrollbar it will not need once the rows arrive.
 *
 * A row has a cell under every heading, counted from the table's own header: a cell more or less
 * than the header is a column more or less in a fixed layout, and the columns jump when the rows
 * arrive.
 */
export const TableSkeletonRows = ({ actions = false }: TableSkeletonRowsProps) => {
  const firstRow = useRef<HTMLTableRowElement>(null)
  const [rows, setRows] = useState(INITIAL_ROWS)
  const [columns, setColumns] = useState(0)

  // Counted again whenever the header changes: a filter can add or drop a heading while the rows are
  // still loading.
  useLayoutEffect(() => {
    const head = firstRow.current?.closest('table')?.tHead
    if (!head) return
    const count = () => {
      const heads = head.rows[0]?.cells
      setColumns(heads ? [...heads].reduce((sum, cell) => sum + cell.colSpan, 0) : 0)
    }
    count()
    const observer = new MutationObserver(count)
    observer.observe(head, { childList: true, subtree: true, attributeFilter: ['colspan'] })
    return () => observer.disconnect()
  }, [])

  // Before paint: measured afterwards, the first rows would be drawn and then multiplied.
  useLayoutEffect(() => {
    const row = firstRow.current
    const fit = () => {
      const top = row?.getBoundingClientRect().top
      if (top === undefined) return
      const available = window.innerHeight - top - BOTTOM_GUTTER
      setRows(Math.max(1, Math.floor(available / ROW_HEIGHT)))
    }

    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const text = actions ? columns - 1 : columns
  return Array.from({ length: rows }, (_, row) => (
    <TableRow key={row} ref={row === 0 ? firstRow : undefined}>
      {Array.from({ length: Math.max(text, 0) }, (_, column) => (
        // As a card, the first field stands in for the row's title.
        <TableCell key={column} card={column === 0 ? 'title' : undefined}>
          <Skeleton className='h-4 w-full' />
        </TableCell>
      ))}
      {actions && columns ? (
        <TableCell card='trail'>
          {/* Sized and placed like the buttons they stand in for, so nothing moves when the rows
              arrive. */}
          <div className='flex justify-end gap-1'>
            <Skeleton className='size-7' />
            <Skeleton className='size-7' />
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  ))
}
