import { today } from '@/lib/days'
import { formatWidth } from './format'
import { matchesSearch } from './search'
import type {
  LocationSlot,
  LocationType,
  OrderLocation,
  Package,
  Remanufacturing,
  WrappingRow
} from '../api'

/**
 * The header search on Wrapping. Every released day is listed at once, so the search runs over all of
 * them — a bench looking for an order does not have to know which day it was cut for.
 */
export const matchesWrapSearch = (row: WrappingRow, search: string | undefined) =>
  matchesSearch(
    search,
    row.order,
    row.order_number,
    row.product_id,
    row.customer,
    row.po,
    row.description
  )

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
 * A line is highlighted whole only while a remake is still owed. Once every one is back its badge
 * turns green and the row stays plain: a green row read as a selected one.
 */
export const remanState = (remans: Remanufacturing[]) => (remanOwed(remans) ? 'owed' : undefined)

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
export const overWeight = (slot: Pick<LocationSlot, 'remaining_weight'>, adding = 0) =>
  slot.remaining_weight !== null && adding > slot.remaining_weight

/** A cell's room as the bench needs it: its own list row, or the order's chip for it. */
export type CellRoom = Pick<
  LocationSlot,
  'location_id' | 'name' | 'max_weight' | 'remaining_weight'
>

/**
 * Where the next package goes: the cell the Worker picked, or else the one the order already
 * stands on. `slot` carries the weight standing there: from this department's list, or — for another
 * department's cell, which that list lacks — from the order's own locations.
 */
export const packageTarget = (
  picked: LocationSlot | null,
  locations: OrderLocation[] | undefined,
  slots: LocationSlot[] | undefined
) => {
  const current = locations?.find(spot => spot.current)
  const target: { location_id: number; name: string | null } | null = picked ?? current ?? null
  // The picked cell is a snapshot from the moment it was clicked; its room is read fresh, so a
  // package just put there counts against it.
  const fresh = (list: CellRoom[] | undefined) =>
    list?.find(candidate => candidate.location_id === target?.location_id)
  const slot: CellRoom | null = fresh(slots) ?? fresh(locations) ?? picked ?? null
  return { target, slot }
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
            weight_on_it: 0,
            used_weight: pending.used_weight,
            remaining_weight: pending.remaining_weight,
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

/** A keypad entry for a measure rather than a count: a plain decimal, no +/−; `null` until it is one. */
export const decimalKeypad = (typed: string) =>
  /^(\d+\.?\d*|\.\d+)$/.test(typed) ? Number(typed) : null

/** A column of Select Location: one location type and its locations, in the server's order. */
export type LocationColumn = {
  key: string
  name: string
  warehouse: string | null
  slots: LocationSlot[]
  position: number
  isDefault: boolean
}

/**
 * Select Location's columns, one per location type. Types in the default warehouse — «the one that
 * opens first» p1 (543,104) — lead, then by their position in Settings and name. A location whose
 * type is not known goes under its warehouse instead.
 */
export const locationColumns = (
  slots: LocationSlot[],
  typeOf: ReadonlyMap<number, LocationType> | undefined
) => {
  const columns = new Map<string, LocationColumn>()
  for (const slot of slots) {
    const type = typeOf?.get(slot.location_id)
    const key = type ? `type-${type.id}` : `warehouse-${slot.warehouse ?? ''}`
    const column = columns.get(key) ?? {
      key,
      name: type?.name ?? slot.warehouse ?? 'Other',
      warehouse: type ? slot.warehouse : null,
      slots: [],
      position: type?.position ?? Number.MAX_SAFE_INTEGER,
      isDefault: slot.warehouse_is_default
    }
    column.slots.push(slot)
    columns.set(key, column)
  }
  return [...columns.values()].toSorted(
    (a, b) =>
      Number(b.isDefault) - Number(a.isDefault) ||
      a.position - b.position ||
      a.name.localeCompare(b.name)
  )
}

/**
 * A location an order or job holds, as its chips and Select Location read it. A job's locations carry
 * no weight or lock of their own, so those are optional.
 */
export type HeldLocation = {
  location_id: number
  name: string | null
  orange?: boolean
  current?: boolean
  over?: boolean
  remaining_weight?: number | null
}

/** How the floor names a line: its product, or the EBMS autoid of one that has none. */
export const lineName = (row: { product_id: string | null; origin_item: string }) =>
  row.product_id ?? row.origin_item

/**
 * A line as a package lists it: its name and its length. An order cuts one product to several
 * lengths, and «2 × MTR8055, 1 × MTR8055» does not say which went in.
 */
export const contentName = (row: {
  product_id: string | null
  origin_item: string | null
  length: number | null
}) => {
  const name = row.product_id ?? row.origin_item ?? '—'
  return row.length === null ? name : `${name} · ${formatWidth(row.length)}"`
}

/** The names a package's contents are read by, keyed by the autoid a package holds. */
export const contentNames = (rows: Parameters<typeof contentName>[0][]) =>
  new Map(rows.map(row => [row.origin_item, contentName(row)]))

type ContentLine = Parameters<typeof contentName>[0]

/**
 * What went into a package, by product: one product cut to many lengths reads as the product once
 * and its lengths longest first, not the product repeated down a line wider than the screen. A
 * package names its lines by autoid, so the caller's own lines say which product and length each is.
 */
export const packageGroups = (contents: Package['contents'], rows: readonly ContentLine[]) => {
  const byId = new Map(rows.map(row => [row.origin_item, row]))
  const groups = new Map<
    string,
    { product: string; total: number; lengths: Map<number | null, number> }
  >()
  for (const item of contents) {
    const row = byId.get(item.origin_item)
    const product = row?.product_id ?? item.origin_item ?? '—'
    const group = groups.get(product) ?? { product, total: 0, lengths: new Map() }
    const length = row?.length ?? null
    group.total += item.quantity
    group.lengths.set(length, (group.lengths.get(length) ?? 0) + item.quantity)
    groups.set(product, group)
  }
  return [...groups.values()].map(({ product, total, lengths }) => ({
    product,
    total,
    pieces: [...lengths]
      .map(([length, quantity]) => ({ length, quantity }))
      .sort((a, b) => (b.length ?? -1) - (a.length ?? -1))
  }))
}
