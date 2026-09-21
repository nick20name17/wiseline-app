import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'
import { useEffect, useRef, useState } from 'react'

// A body row is as tall as the header row; both come from ui/table.tsx.
const ROW_HEIGHT = 37

// Enough to cover the first paint, before the measurement below trims or extends it.
const INITIAL_ROWS = 5

// Keeps the card off the bottom edge of the window.
const BOTTOM_GUTTER = 24

type TableSkeletonRowsProps = {
  /** Columns holding text, not counting the trailing actions column. */
  columns: number
}

/**
 * Placeholder rows that fill the window below the table and stop there, so a slow list never
 * grows a scrollbar it will not need once the rows arrive.
 */
export const TableSkeletonRows = ({ columns }: TableSkeletonRowsProps) => {
  const firstRow = useRef<HTMLTableRowElement>(null)
  const [rows, setRows] = useState(INITIAL_ROWS)

  useEffect(() => {
    const fit = () => {
      const top = firstRow.current?.getBoundingClientRect().top
      if (top === undefined) return
      const available = window.innerHeight - top - BOTTOM_GUTTER
      setRows(Math.max(1, Math.floor(available / ROW_HEIGHT)))
    }

    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  return Array.from({ length: rows }, (_, row) => (
    <TableRow key={row} ref={row === 0 ? firstRow : undefined}>
      {Array.from({ length: columns }, (_, column) => (
        <TableCell key={column}>
          {/* The bar takes the column's width, whatever the layout gave it. */}
          <Skeleton className='h-4 w-full' />
        </TableCell>
      ))}
      <TableCell>
        {/* Sized and placed like the buttons they stand in for, so nothing moves when the rows
            arrive. */}
        <div className='flex justify-end gap-1'>
          <Skeleton className='size-7' />
          <Skeleton className='size-7' />
        </div>
      </TableCell>
    </TableRow>
  ))
}
