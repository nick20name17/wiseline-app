import { describe, expect, it } from 'vitest'
import type { LocationSlot, WrappingRow } from '../api'
import {
  applyKeypad,
  defaultWarehouseOf,
  overPackageLimit,
  packageContents,
  packageWeight,
  warehousesOf
} from './wrapping'

describe('applyKeypad', () => {
  it('adds, takes away, or replaces', () => {
    expect(applyKeypad(50, '+10', 150)).toBe(60)
    expect(applyKeypad(50, '-5', 150)).toBe(45)
    expect(applyKeypad(50, '148', 150)).toBe(148)
  })

  it('stays between nothing and the quantity ordered', () => {
    expect(applyKeypad(50, '+200', 150)).toBe(150)
    expect(applyKeypad(5, '-10', 150)).toBe(0)
  })

  it('refuses what is not a figure', () => {
    expect(applyKeypad(50, '', 150)).toBeNull()
    expect(applyKeypad(50, '+', 150)).toBeNull()
    expect(applyKeypad(50, '1.5', 150)).toBeNull()
  })
})

describe('warehousesOf', () => {
  const slot = (warehouse: string | null) => ({ warehouse }) as LocationSlot

  it('puts the default warehouse first and the rest by name', () => {
    const slots = [slot('Trim Shop'), slot('Coil Yard'), slot('Main Warehouse'), slot('Coil Yard')]
    expect(warehousesOf(slots, 'Main Warehouse')).toEqual([
      'Main Warehouse',
      'Coil Yard',
      'Trim Shop'
    ])
    expect(warehousesOf(slots, null)).toEqual(['Coil Yard', 'Main Warehouse', 'Trim Shop'])
  })
})

describe('defaultWarehouseOf', () => {
  const slot = (warehouse: string | null, isDefault: boolean) =>
    ({ warehouse, warehouse_is_default: isDefault }) as LocationSlot

  it('names the warehouse the server marks as the default', () => {
    expect(defaultWarehouseOf([slot('Coil Yard', false), slot('Main Warehouse', true)])).toBe(
      'Main Warehouse'
    )
    expect(defaultWarehouseOf([slot('Coil Yard', false)])).toBeNull()
  })
})

describe('packageContents', () => {
  it('names each line by product, falling back to its autoid', () => {
    const names = new Map([['A1', 'TBT8262']])
    expect(
      packageContents(
        [
          { origin_item: 'A1', quantity: 4 },
          { origin_item: 'B2', quantity: 2 }
        ],
        names
      )
    ).toBe('4 × TBT8262, 2 × B2')
  })

  it('says so when the package is empty', () => {
    expect(packageContents([], new Map())).toBe('—')
  })
})

describe('packageWeight', () => {
  const line = (unitWeight: number | null, quantity: number) => ({
    row: { unit_weight: unitWeight } as WrappingRow,
    quantity
  })

  it('weighs every staged piece at its line weight', () => {
    expect(packageWeight([line(1.1, 3), line(2.5, 4)])).toBe(13.3)
  })

  it('knows no weight once a line does not say what it weighs', () => {
    expect(packageWeight([line(1.1, 3), line(null, 4)])).toBeNull()
  })
})

describe('overPackageLimit', () => {
  it('holds a package to the ceiling, if there is one and its weight is known', () => {
    expect(overPackageLimit(501, 500)).toBe(true)
    expect(overPackageLimit(500, 500)).toBe(false)
    expect(overPackageLimit(900, null)).toBe(false)
    expect(overPackageLimit(null, 500)).toBe(false)
  })
})
