import type { LocationSlot } from '../api'

/** What the location picker lays a location out by: its warehouse tab and its type's column. */
export type GridSlot = Pick<
  LocationSlot,
  | 'location_id'
  | 'name'
  | 'warehouse_id'
  | 'warehouse'
  | 'warehouse_is_default'
  | 'location_type_id'
  | 'location_type'
>

/** A warehouse tab of the location picker. */
export type GridWarehouse = { id: number | null; name: string; isDefault: boolean }

/** The warehouses the slots stand in, the company's default first, then by name. */
export const locationWarehouses = (slots: GridSlot[]) => {
  const warehouses = new Map<number | null, GridWarehouse>()
  for (const slot of slots)
    if (!warehouses.has(slot.warehouse_id))
      warehouses.set(slot.warehouse_id, {
        id: slot.warehouse_id,
        name: slot.warehouse ?? 'No warehouse',
        isDefault: slot.warehouse_is_default
      })
  return [...warehouses.values()].toSorted(
    (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name)
  )
}

/**
 * The warehouse the picker opens on: the department's own default p1 (543,104) when it has
 * locations there, else the company's default, else the first.
 */
export const openingWarehouse = (warehouses: GridWarehouse[], departmentDefault: number | null) =>
  (warehouses.find(warehouse => warehouse.id === departmentDefault) ?? warehouses[0])?.id ?? null

/** A column of the picker: one location type and its locations. */
export type GridColumn<T extends GridSlot> = { key: string; name: string; slots: T[] }

/**
 * The picker's columns, one per location type, in the server's order — the types' Settings order.
 * A location of no type goes under Other, last.
 */
export const locationColumns = <T extends GridSlot>(slots: T[]) => {
  const columns = new Map<number | null, GridColumn<T>>()
  for (const slot of slots) {
    const column = columns.get(slot.location_type_id) ?? {
      key: `type-${slot.location_type_id ?? 'none'}`,
      name: slot.location_type ?? 'Other',
      slots: []
    }
    column.slots.push(slot)
    columns.set(slot.location_type_id, column)
  }
  const untyped = columns.get(null)
  columns.delete(null)
  return untyped ? [...columns.values(), untyped] : [...columns.values()]
}
