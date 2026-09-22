import { useQuery } from '@tanstack/react-query'
import { lineNotesSummaryQuery, type TrimLineItem } from '../api'
import type { NoteState } from './note-button'

/**
 * Whether each line item's note dot is red, green or absent, for a whole expanded order at once — one
 * call for the table rather than one per row.
 */
export const useLineNoteState = (items: TrimLineItem[]) => {
  const { data } = useQuery(lineNotesSummaryQuery(items.map(item => item.id)))

  return (item: TrimLineItem): NoteState => {
    const summary = data?.[item.id]
    if (!summary?.has_notes) return 'none'
    return summary.unread > 0 ? 'unread' : 'read'
  }
}
