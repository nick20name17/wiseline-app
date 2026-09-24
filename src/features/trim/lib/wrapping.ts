import type { LocationSlot, OrderLocation, Package, Remanufacturing, WrappingRow } from '../api'
import { today } from './format'

/** Every piece the remakes asked for, back or not. */
export const remanTotal = (remans: Remanufacturing[]) =>
  remans.reduce((total, reman) => total + (reman.remanufacturing_qty ?? 0), 0)

/**
 * The pieces a line is still owed: every remake the machine has not marked Bent. The Slinet's cut
 * does not count — at the wrapping bench the pieces are not back until they have been bent.
 */
export const remanOwed = (remans: Remanufacturing[]) =>
  remanTotal(remans.filter(reman => !reman.is_bent))

/**
 * How many more pieces may be asked for: never past the Qty Ordered, less what is already owed — two
 * open requests that together exceed the line would have it owing pieces it never had.
 */
export const remakeRoom = (qtyOrdered: number, remans: Remanufacturing[]) =>
  Math.max(0, qtyOrdered - remanOwed(remans))

/**
 * How a line under remanufacture is highlighted: `owed` while a remake is out, `done` once every one
 * is back. A line nothing was ever remade on is left plain.
 */
export const remanState = (remans: Remanufacturing[]) =>
  !remans.length ? undefined : remanOwed(remans) ? 'owed' : 'done'

/**
 * What a package weighs: every staged piece at its line's weight. `null` once any line's weight is
 * unknown — a partial sum would read as the package's weight and slip under the ceiling.
 */
export const packageWeight = (lines: { row: WrappingRow; quantity: number }[]) => {
  let total = 0
  for (const { row, quantity } of lines) {
    if (row.unit_weight === null) return null
    total += row.unit_weight * quantity
  }
  // Cents of a pound only undo the float noise of the multiplication.
  return Math.round(total * 100) / 100
}

/** Over the department's Max Weight per package; `null` is no ceiling. */
export const overPackageLimit = (weight: number | null, limit: number | null) =>
  weight !== null && limit !== null && weight > limit

/** Past its ceiling already, or would be once `adding` more pounds stand on it. */
export const overWeight = (slot: LocationSlot, adding = 0) =>
  slot.max_weight !== null && slot.used_weight + adding > slot.max_weight

/**
 * Where the next package goes: the cell the Worker picked, or else the one the order already
 * stands on. `slot` carries the weight standing there, when this department's list has the cell.
 */
export const packageTarget = (
  picked: LocationSlot | null,
  locations: OrderLocation[] | undefined,
  slots: LocationSlot[] | undefined
) => {
  const current = locations?.find(spot => spot.current)
  const target: { location_id: number; name: string | null } | null = picked ?? current ?? null
  const slot = picked ?? slots?.find(candidate => candidate.location_id === current?.location_id)
  return { target, slot: slot ?? null }
}

/** An order's location as the bench shows it: `over` when the staged package would overload it. */
export type ShownLocation = OrderLocation & { over?: boolean }

/**
 * The chips under Trim Location. A picked location shows the moment it is clicked p1 (937,395),
 * though the server holds it only once a package lands there. Once a second one is picked, the one
 * packages have been going to turns orange: nothing more goes on it p1 (861,462) — the server marks
 * it too, but only after the next package lands. The one this package would overload is red before
 * it is printed p1 (846,414).
 */
export const benchLocations = (
  locations: OrderLocation[] | undefined,
  picked: LocationSlot | null,
  overloaded: number | null
): { shown: ShownLocation[]; pendingId: number | null } => {
  const onOrder = locations ?? []
  const pending =
    picked && !onOrder.some(spot => spot.location_id === picked.location_id) ? picked : null
  const shown: ShownLocation[] = [
    ...onOrder.map(spot =>
      spot.current && picked && picked.location_id !== spot.location_id
        ? { ...spot, orange: true }
        : spot
    ),
    ...(pending
      ? [
          {
            location_id: pending.location_id,
            name: pending.name,
            max_weight: pending.max_weight,
            packages: 0,
            weight_on_it: pending.used_weight,
            orange: false,
            current: true
          }
        ]
      : [])
  ]
  return {
    shown: shown.map(spot => (spot.location_id === overloaded ? { ...spot, over: true } : spot)),
    pendingId: pending?.location_id ?? null
  }
}

/** An order is late once its earliest production day has passed with pieces still to wrap. */
export const orderOverdue = (rows: WrappingRow[]) => {
  const firstDay = rows
    .map(row => row.production_date)
    .filter((day): day is string => !!day)
    .toSorted((a, b) => a.localeCompare(b))[0]
  const left = rows.some(row => row.wrapped < row.qty_ordered)
  return !!firstDay && firstDay < today() && left
}

/** What Wrapping may take from a line now: Left To Wrap, less what an open remake still holds. */
export const wrapAllowed = (row: WrappingRow, remans: Remanufacturing[]) =>
  Math.max(0, row.left_to_wrap - remanOwed(remans))

/** A typed quantity as a whole number of pieces, never past what may be wrapped. */
export const stagedQuantity = (raw: string | undefined, allowed: number) => {
  const parsed = Number.parseInt(raw ?? '', 10)
  return Math.min(Number.isNaN(parsed) || parsed < 0 ? 0 : parsed, allowed)
}

/**
 * What a keypad entry makes of a figure: «+10» adds, «-5» takes away, a bare number replaces it
 * (p1 (750,386)). Held to 0..max; `null` when nothing usable was typed.
 */
export const applyKeypad = (current: number, typed: string, max: number) => {
  const match = /^([+-]?)(\d+)$/.exec(typed.trim())
  if (!match) return null
  const [, sign, digits] = match
  const amount = Number(digits)
  const next = sign === '+' ? current + amount : sign === '-' ? current - amount : amount
  return Math.min(max, Math.max(0, next))
}

/**
 * The warehouses a set of locations stands in, the default one first — «the one that opens first when
 * selecting a location» p1 (543,104) — and the rest by name.
 */
export const warehousesOf = (slots: LocationSlot[], defaultName: string | null) =>
  [...new Set(slots.map(slot => slot.warehouse ?? ''))].toSorted(
    (a, b) => Number(b === defaultName) - Number(a === defaultName) || a.localeCompare(b)
  )

/** The warehouse the server marks as the default, among the ones these locations stand in. */
export const defaultWarehouseOf = (slots: LocationSlot[]) =>
  slots.find(slot => slot.warehouse_is_default)?.warehouse ?? null

/** How the floor names a line: its product, or the EBMS autoid of one that has none. */
export const lineName = (row: { product_id: string | null; origin_item: string }) =>
  row.product_id ?? row.origin_item

/**
 * What went into a package, line by line. A package names its lines by autoid, so the caller's own
 * lines say which product each one is.
 */
export const packageContents = (
  contents: Package['contents'],
  names: ReadonlyMap<string | null, string | null>
) =>
  contents
    .map(item => `${item.quantity} × ${names.get(item.origin_item) ?? item.origin_item ?? '—'}`)
    .join(', ') || '—'
