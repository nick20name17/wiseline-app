import { useQuery } from '@tanstack/react-query'
import { lineNotesSummaryQuery } from '../api'
import type { NoteState } from './note-button'

/**
 * Whether each line item's note dot is red, green or absent, for a whole table at once — one call
 * rather than one per row. Keyed by the EBMS autoid of the line.
 */
export const useLineNoteState = (originItems: string[]) => {
  const { data } = useQuery(lineNotesSummaryQuery(originItems))

  return (originItem: string): NoteState => {
    const summary = data?.[originItem]
    if (!summary?.has_notes) return 'none'
    return summary.unread > 0 ? 'unread' : 'read'
  }
}
