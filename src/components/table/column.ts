import type { TableCellCard } from '@/components/ui/table'

// Narrower and a heading is no longer there to grab; wider and one column pushes the rest of the
// table out of sight. A column whose content needs other bounds sets its own.
const MIN_WIDTH = 64
const MAX_WIDTH = 640

export type Column = {
  key: string
  /** Also what the drag announcements call the column. */
  label: string
  /** The width class of the column's `<col>`; none takes what the others leave. */
  width?: string
  /** px a drag cannot take it below or past; 64 and 640 unless set. */
  minWidth?: number
  maxWidth?: number
  /** The column is obvious from its cells, so its heading is for screen readers only. */
  hideLabel?: boolean
  /** Where its cells go when the table is laid out as cards; a labelled field unless set. */
  card?: TableCellCard
}

/** The least a drag leaves the column, and the least a table leaves one with no width of its own. */
export const minWidth = (column?: Column) => column?.minWidth ?? MIN_WIDTH

/** `width` kept within the column's bounds: a drag, or a width saved before the bounds were. */
export const clampWidth = (column: Column, width: number) =>
  Math.min(column.maxWidth ?? MAX_WIDTH, Math.max(minWidth(column), Math.round(width)))
