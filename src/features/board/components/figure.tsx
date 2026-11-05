import type { ReactNode } from 'react'

/** A figure in a table cell. Nothing to show leaves the cell empty, so the eye finds the cells carrying work. */
export const Figure = ({ value }: { value: ReactNode }) =>
  value === null || value === undefined || value === '' ? null : (
    <span className='font-mono'>{value}</span>
  )
