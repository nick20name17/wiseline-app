import type { BoardLineItem, BoardOrder } from '../api'
import { onMachine } from './machines'
import { partDays, partLines } from './parts'

// Packed and located: the line has left the machine's list.
const DONE = new Set(['wrapped'])

/** One order's released, unfinished lines on one machine for one day — a row of Production. */
export type ProductionPart = { order: BoardOrder; day: string; lines: BoardLineItem[] }

/**
 * A Rollforming machine's Production tab p2 (1007,312): the orders released to it and not yet done,
 * a row per production day, earliest first p2 (1045,276).
 */
export const productionParts = (
  orders: BoardOrder[],
  machineId: number,
  departmentId: number | undefined
): ProductionPart[] =>
  onMachine(orders, machineId)
    .flatMap(order =>
      partDays(order, departmentId).flatMap(day => {
        const lines = partLines(order, day).filter(
          line => line.item?.is_released && !DONE.has(line.item.status ?? '')
        )
        return lines.length ? [{ order, day, lines }] : []
      })
    )
    .toSorted(
      (a, b) => a.day.localeCompare(b.day) || a.order.invoice.localeCompare(b.order.invoice)
    )

const waiting = (line: BoardLineItem) => line.item?.coil_icon === 'waiting_to_slit'

/**
 * The coil numbers a part's lines are rolled from, each once p2 (1040,313), and «waiting...» while some
 * of it is still at the Slit Line p2 (1086,321), (1125,332).
 */
export const coilNumbersOf = (lines: BoardLineItem[]) => [
  ...new Set(
    lines.flatMap(line =>
      waiting(line) ? ['waiting...'] : line.item?.coil_number ? [line.item.coil_number] : []
    )
  )
]

/**
 * Where a part's coil comes from, as one icon: still at the Slit Line if any of it is p2 (1086,315),
 * slit once all of that is, otherwise an existing coil.
 */
export const sourceOf = (lines: BoardLineItem[]) =>
  lines.some(waiting)
    ? 'waiting_to_slit'
    : lines.some(line => line.item?.coil_icon === 'slit')
      ? 'slit'
      : lines.some(line => line.item?.coil_icon === 'coil')
        ? 'coil'
        : null
