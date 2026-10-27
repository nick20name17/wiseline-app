import { arrayMove } from '@dnd-kit/sortable'
import type { Priority } from '../api'

const byHierarchy = (a: Priority, b: Priority) => a.position - b.position || a.id - b.id

/**
 * Moves `activeId` onto `overId` within the hierarchy the dragged row belongs to: its department's
 * own priorities, or the ones with no department, which rank on every board. The server renumbers
 * one hierarchy at a time, so rows of the other only set where the drop lands. `department` and
 * `ids` are that hierarchy, top first, as the save takes them. `rows` is the list as it will read
 * once saved: both hierarchies number from 1 and interleave by number, so the dragged row may
 * settle beside where it was dropped. `null` when the hierarchy's order is unchanged.
 */
export const reorder = (priorities: Priority[], activeId: number, overId: number) => {
  const from = priorities.findIndex(priority => priority.id === activeId)
  const to = priorities.findIndex(priority => priority.id === overId)
  if (from === -1 || to === -1 || from === to) return null

  const scope = priorities[from]!.department
  const own = (list: Priority[]) => list.filter(priority => priority.department === scope)
  const next = own(arrayMove(priorities, from, to))
  const before = own(priorities)
  if (next.every((priority, index) => priority.id === before[index]?.id)) return null

  const positions = new Map(next.map(({ id }, index) => [id, index + 1]))
  return {
    department: scope,
    rows: priorities
      .map(priority => ({ ...priority, position: positions.get(priority.id) ?? priority.position }))
      .sort(byHierarchy),
    ids: next.map(({ id }) => id)
  }
}
