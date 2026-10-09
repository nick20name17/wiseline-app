import { useQuery } from '@tanstack/react-query'
import { isStockOrder, lineNotesSummaryQuery, orderNotesQuery, type BoardOrder } from '../api'
import type { NoteState } from '@/components/note-button'

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

/** The salesman's Order Notes for a tab's orders. A stock order has no EBMS row to import one from. */
export const useOrderNotes = (orders: BoardOrder[]) => {
  const { data: notes } = useQuery(
    orderNotesQuery(orders.filter(order => !isStockOrder(order)).map(order => order.id))
  )

  const noteState = (order: BoardOrder): NoteState => {
    const note = notes?.[order.id]
    if (!note?.has_note) return 'none'
    return note.read ? 'read' : 'unread'
  }

  return { notes, noteState }
}
