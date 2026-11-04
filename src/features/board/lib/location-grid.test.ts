import { describe, expect, it } from 'vitest'
import type { LocationSlot } from '../api'
import { locationColumns, locationWarehouses, openingWarehouse } from './location-grid'

describe('locationColumns', () => {
  const slot = (location_id: number, type: number | null, name: string | null = null) =>
    ({ location_id, location_type_id: type, location_type: name }) as LocationSlot

  it('makes a column per type in the server’s order, a location of no type last under Other', () => {
    const columns = locationColumns([
      slot(1, null),
      slot(2, 11, 'Carts'),
      slot(3, 10, 'Racks'),
      slot(4, 11, 'Carts')
    ])
    expect(columns.map(column => column.name)).toEqual(['Carts', 'Racks', 'Other'])
    expect(columns[0]?.slots.map(entry => entry.location_id)).toEqual([2, 4])
  })
})

describe('locationWarehouses', () => {
  const slot = (warehouse_id: number | null, warehouse: string | null, isDefault = false) =>
    ({ warehouse_id, warehouse, warehouse_is_default: isDefault }) as LocationSlot

  it('lists each warehouse once, the default first, then by name', () => {
    const warehouses = locationWarehouses([
      slot(2, 'Yard'),
      slot(3, 'Annex'),
      slot(1, 'Main', true),
      slot(2, 'Yard'),
      slot(null, null)
    ])
    expect(warehouses.map(warehouse => warehouse.name)).toEqual([
      'Main',
      'Annex',
      'No warehouse',
      'Yard'
    ])
  })

  it('opens on the department’s own default, else the first', () => {
    const warehouses = locationWarehouses([slot(1, 'Main', true), slot(2, 'Yard')])
    expect(openingWarehouse(warehouses, 2)).toBe(2)
    expect(openingWarehouse(warehouses, 9)).toBe(1)
    expect(openingWarehouse(warehouses, null)).toBe(1)
    expect(openingWarehouse([], 2)).toBeNull()
  })
})
