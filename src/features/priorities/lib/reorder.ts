import { arrayMove } from '@dnd-kit/sortable'
import type { Priority } from '../api'

/**
 * One department's priorities after moving `activeId` onto `overId`: the rows in their new order, and the
 * priorities renumbered 1..N whose number changed — those are the ones to save. Nothing moves when
 * either is not in the list or they are the same.
 */
export const reorder = (priorities: Priority[], activeId: number, overId: number) => {
  const from = priorities.findIndex(priority => priority.id === activeId)
  const to = priorities.findIndex(priority => priority.id === overId)
  if (from === -1 || to === -1 || from === to) return { rows: priorities, moved: [] }

  const next = arrayMove(priorities, from, to)
  return {
    rows: next,
    moved: next
      .map((priority, index) => ({ ...priority, position: index + 1 }))
      .filter((priority, index) => priority.position !== next[index]!.position)
  }
}
