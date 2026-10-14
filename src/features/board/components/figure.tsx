import type { ReactNode } from 'react'

/** A figure in a table cell. Nothing to show is a dash, so the eye finds the cells carrying work. */
export const Figure = ({ value }: { value: ReactNode }) =>
  value === null || value === undefined || value === '' ? (
    <span className='text-muted-foreground'>—</span>
  ) : (
    <span className='font-mono'>{value}</span>
  )
