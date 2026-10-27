import { arrayMove } from '@dnd-kit/sortable'
import type { Machine } from '../api'

// Work enters a department through its cutter and leaves it wrapped, so these hold the ends of the
// order whatever is dragged (call of 2026-10-26).
const FIRST_KINDS = ['cutting', 'slit_line']
const LAST_KINDS = ['wrapping']

/** Where a machine is held: one of the ends, or `null` for one that is free to move. */
export const pinnedEnd = (machine: Machine) =>
  FIRST_KINDS.includes(machine.kind ?? '')
    ? 'first'
    : LAST_KINDS.includes(machine.kind ?? '')
      ? 'last'
      : null

const RANK = { first: 0, free: 1, last: 2 }

/** A department's machines as its board shows them: by position, between the pinned ends. */
export const inMachineOrder = (machines: Machine[]) =>
  machines.toSorted(
    (a, b) =>
      RANK[pinnedEnd(a) ?? 'free'] - RANK[pinnedEnd(b) ?? 'free'] ||
      (a.position ?? 0) - (b.position ?? 0) ||
      a.id - b.id
  )

/**
 * The department's machines after `activeId` is dropped on `overId`, in order; `null` when nothing
 * moves. A pinned machine neither moves nor is moved past.
 */
export const reorderMachines = (machines: Machine[], activeId: number, overId: number) => {
  const from = machines.findIndex(machine => machine.id === activeId)
  const to = machines.findIndex(machine => machine.id === overId)
  if (from === -1 || to === -1 || from === to) return null
  if (pinnedEnd(machines[from]!) || pinnedEnd(machines[to]!)) return null
  return arrayMove(machines, from, to)
}
