import type { TableCellCard } from '@/components/ui/table'

// Narrower and a heading is no longer there to grab; wider and one column pushes the rest of the
// table out of sight. A column whose content needs other bounds sets its own.
const MIN_WIDTH = 64
const MAX_WIDTH = 740
// Free text wraps word by word below this: a description one word to a line reads as a list.
const MIN_TEXT_WIDTH = 160

export type Column = {
  key: string
  /** Also what the drag announcements call the column. */
  label: string
  /** The width class of the column's `<col>`; none takes what the others leave. */
  width?: string
  /**
   * px a drag cannot take it below or past; 64 (160 for free text) and 740 unless set. Set where
   * what the column holds — a date, a pill — is wider than both that and its heading.
   */
  minWidth?: number
  maxWidth?: number
  /** Always its declared width: a drag cannot change it, as for a column of buttons or icons. */
  fixed?: boolean
  /** The column is obvious from its cells, so its heading is for screen readers only. */
  hideLabel?: boolean
  /** Free text, read from its start; any other column is centred. */
  align?: 'start'
  /** Where its cells go when the table is laid out as cards; a labelled field unless set. */
  card?: TableCellCard
  /** A click on the heading sorts the table by it, when the table passes a sort. */
  sortable?: boolean
}

/** The least a drag leaves the column, and the least a table leaves one with no width of its own. */
export const minWidth = (column?: Column) =>
  column?.minWidth ?? (column?.align === 'start' ? MIN_TEXT_WIDTH : MIN_WIDTH)

/**
 * `minWidth`, or more when the heading's longest word needs it: no column is dragged or squeezed
 * narrower than its own heading. Lays the heading out: call it for a drag, or a column with no width.
 */
export const leastWidth = (column: Column | undefined, head: Element | null | undefined) => {
  const label = head?.querySelector<HTMLElement>('[data-heading]')
  if (!head || !label || column?.hideLabel) return minWidth(column)
  const { paddingLeft, paddingRight } = getComputedStyle(head)
  const before = label.style.width
  label.style.width = 'min-content'
  // The label's own padding is given back by its negative margin.
  const { width } = label.getBoundingClientRect()
  const { paddingLeft: inner, paddingRight: innerEnd } = getComputedStyle(label)
  label.style.width = before
  const heading =
    width -
    parseFloat(inner) -
    parseFloat(innerEnd) +
    parseFloat(paddingLeft) +
    parseFloat(paddingRight)
  return Math.max(minWidth(column), Math.ceil(heading))
}

/** `width` kept within the column's bounds: a drag, or a width saved before the bounds were. */
export const clampWidth = (column: Column, width: number, least = minWidth(column)) =>
  Math.min(column.maxWidth ?? MAX_WIDTH, Math.max(least, Math.round(width)))
