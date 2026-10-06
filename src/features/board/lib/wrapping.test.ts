import { describe, expect, it } from 'vitest'
import type { LocationSlot, OrderLocation, WrappingRow } from '../api'
import {
  applyKeypad,
  benchLocations,
  decimalKeypad,
  defaultWarehouseOf,
  matchesWrapSearch,
  overPackageLimit,
  packageContents,
  packageTarget,
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

describe('decimalKeypad', () => {
  it('reads a decimal as it is being typed', () => {
    expect(decimalKeypad('0.0179')).toBe(0.0179)
    expect(decimalKeypad('.5')).toBe(0.5)
    expect(decimalKeypad('12.')).toBe(12)
    expect(decimalKeypad('0')).toBe(0)
  })

  it('refuses what is not a figure', () => {
    expect(decimalKeypad('')).toBeNull()
    expect(decimalKeypad('.')).toBeNull()
    expect(decimalKeypad('1.2.3')).toBeNull()
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

describe('benchLocations', () => {
  const spot = (location_id: number, current = false): OrderLocation => ({
    location_id,
    name: String(location_id),
    max_weight: 1000,
    packages: 1,
    weight_on_it: 400,
    used_weight: 400,
    remaining_weight: 600,
    orange: false,
    current
  })
  const slot = (location_id: number) =>
    ({
      location_id,
      name: String(location_id),
      max_weight: 800,
      used_weight: 100,
      remaining_weight: 700
    }) as LocationSlot

  it('shows a picked location before any package lands on it, and locks the current one', () => {
    const { shown, pendingId } = benchLocations([spot(405, true)], slot(410), null)
    expect(pendingId).toBe(410)
    expect(shown.map(({ location_id, orange }) => [location_id, orange])).toEqual([
      [405, true],
      [410, false]
    ])
    expect(shown[1]).toMatchObject({
      packages: 0,
      weight_on_it: 0,
      used_weight: 100,
      remaining_weight: 700,
      current: true
    })
  })

  it('adds nothing for a pick the order already stands on', () => {
    const { shown, pendingId } = benchLocations([spot(405, true)], slot(405), null)
    expect(pendingId).toBeNull()
    expect(shown).toEqual([spot(405, true)])
  })

  it('marks the location the staged package would overload', () => {
    const { shown } = benchLocations([spot(405, true), spot(406)], null, 405)
    expect(shown.map(location => !!location.over)).toEqual([true, false])
  })
})

describe('packageTarget', () => {
  it('reads the picked cell’s room from the fresh list, not from the moment it was clicked', () => {
    const clicked = { location_id: 29, name: 'A-02', remaining_weight: 800 } as LocationSlot
    const fresh = { ...clicked, remaining_weight: 764 }
    expect(packageTarget(clicked, [], [fresh]).slot?.remaining_weight).toBe(764)
    // Before the list loads the click is all there is.
    expect(packageTarget(clicked, [], undefined).slot).toBe(clicked)
  })
})

describe('matchesWrapSearch', () => {
  const row = {
    order: '330608',
    order_number: null,
    product_id: 'RC8262',
    customer: 'Jones Roofing',
    po: null,
    description: 'Ridge cap'
  } as WrappingRow

  it('finds a line by its order, product or customer, whatever the case', () => {
    expect(matchesWrapSearch(row, '3306')).toBe(true)
    expect(matchesWrapSearch(row, 'rc82')).toBe(true)
    expect(matchesWrapSearch(row, ' jones ')).toBe(true)
  })

  it('keeps every line for no search, and drops the rest', () => {
    expect(matchesWrapSearch(row, undefined)).toBe(true)
    expect(matchesWrapSearch(row, '  ')).toBe(true)
    expect(matchesWrapSearch(row, '999')).toBe(false)
  })
})
