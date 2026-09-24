import { arrayMove } from '@dnd-kit/sortable'
import type { Priority } from '../api'

/**
 * The rows after moving `activeId` onto `overId`, and what to save for the hierarchy being dragged:
 * `scope` is a department's own priorities, or `null` for the ones with no department, which rank on
 * every board. Other rows ride along unsaved. `ids` is that hierarchy top first; `changed` the ones
 * whose number 1..n moved. `null` when the hierarchy's order is unchanged.
 */
export const reorder = (
  priorities: Priority[],
  scope: number | null,
  activeId: number,
  overId: number
) => {
  const from = priorities.findIndex(priority => priority.id === activeId)
  const to = priorities.findIndex(priority => priority.id === overId)
  if (from === -1 || to === -1 || from === to) return null

  const own = (list: Priority[]) => list.filter(priority => priority.department === scope)
  const rows = arrayMove(priorities, from, to)
  const next = own(rows)
  const before = own(priorities)
  if (next.every((priority, index) => priority.id === before[index]?.id)) return null
  return {
    rows,
    ids: next.map(({ id }) => id),
    changed: next
      .map((priority, index) => ({ id: priority.id, position: index + 1 }))
      .filter(
        ({ id, position }) => next.find(priority => priority.id === id)?.position !== position
      )
  }
}
