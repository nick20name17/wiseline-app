import type { BoardOrder, Machine } from '../api'

/**
 * A Rollforming machine tab: a machine's id, or the lines no machine takes — a profile no machine
 * lists yet, which would otherwise be on no tab at all.
 */
export type MachineTab = number | 'none'

/** The machines a department's tabs are made of, in the order the department keeps them. */
export const machineTabsOf = (machines: Machine[], departmentId: number | undefined) =>
  machines.filter(machine => machine.department === departmentId && machine.kind === 'rollforming')

/**
 * The orders as one machine tab shows them: each narrowed to its lines on that machine, and an order
 * with none left out p2 (542,280). No tab is every order whole.
 */
export const onMachine = (orders: BoardOrder[], tab: MachineTab | undefined) =>
  tab === undefined
    ? orders
    : orders.flatMap(order => {
        const lines = order.origin_items.filter(line => (line.machine_id ?? 'none') === tab)
        // The count drops by as many, so an order whole on its day is not read as part-scheduled.
        const dropped = order.origin_items.length - lines.length
        return lines.length
          ? [{ ...order, origin_items: lines, count_items: (order.count_items ?? 0) - dropped }]
          : []
      })
