import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { LocationSlot, LocationType, OrderLocation, WrappingRow } from '../api'
import {
  applyKeypad,
  benchLocations,
  decimalKeypad,
  locationColumns,
  matchesWrapSearch,
  overPackageLimit,
  packageContents,
  packageTarget,
  packageWeight
} from './wrapping'

// What each sign does, spelled out apart from the code under test.
const KEYPAD: Record<string, (current: number, amount: number) => number> = {
  '+': (current, amount) => current + amount,
  '-': (current, amount) => current - amount,
  '': (_, amount) => amount
}

describe('applyKeypad', () => {
  it('adds, takes away, or replaces', () => {
    expect(applyKeypad(50, '+10', 150)).toBe(60)
    expect(applyKeypad(50, '-5', 150)).toBe(45)
    expect(applyKeypad(50, '148', 150)).toBe(148)
    expect(applyKeypad(50, ' +10 ', 150)).toBe(60)
  })

  it('always lands between nothing and the most, and replaces with a bare number', () => {
    fc.assert(
      fc.property(
        fc.nat(500),
        fc.constantFrom('', '+', '-'),
        fc.nat(1000),
        fc.nat(500),
        (current, sign, amount, max) => {
          const next = applyKeypad(current, `${sign}${amount}`, max)!
          expect(next).toBeGreaterThanOrEqual(0)
          expect(next).toBeLessThanOrEqual(max)
          expect(next).toBe(Math.min(max, Math.max(0, KEYPAD[sign]!(current, amount))))
        }
      )
    )
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
    expect(decimalKeypad('.25')).toBe(0.25)
    expect(decimalKeypad('12.')).toBe(12)
    expect(decimalKeypad('0')).toBe(0)
  })

  it('refuses what is not a figure', () => {
    expect(decimalKeypad('')).toBeNull()
    expect(decimalKeypad('.')).toBeNull()
    expect(decimalKeypad('1.2.3')).toBeNull()
  })
})

describe('locationColumns', () => {
  const slot = (location_id: number, warehouse: string, isDefault = false) =>
    ({ location_id, warehouse, warehouse_is_default: isDefault }) as LocationSlot
  const type = (id: number, name: string, position: number | null): LocationType => ({
    id,
    name,
    position
  })

  it('makes a column per type, the default warehouse first, then by position and name', () => {
    const typeOf = new Map([
      [1, type(10, 'Racks', 2)],
      [2, type(11, 'Carts', 1)],
      [3, type(10, 'Racks', 2)],
      [4, type(12, 'Finished Line', 5)]
    ])
    const columns = locationColumns(
      [slot(1, 'Yard'), slot(2, 'Yard'), slot(3, 'Yard'), slot(4, 'Main', true), slot(5, 'Yard')],
      typeOf
    )
    expect(columns.map(column => column.name)).toEqual(['Finished Line', 'Carts', 'Racks', 'Yard'])
    expect(columns[2]?.slots.map(entry => entry.location_id)).toEqual([1, 3])
    // A location of no known type goes under its warehouse.
    expect(columns[3]?.slots.map(entry => entry.location_id)).toEqual([5])
  })

  it('puts a location of no known type and no warehouse under Other, after the typed ones', () => {
    const columns = locationColumns(
      [
        { location_id: 7, warehouse: null, warehouse_is_default: false } as LocationSlot,
        slot(1, 'Yard')
      ],
      new Map([[1, type(10, 'Racks', 99)]])
    )
    expect(columns.map(column => [column.key, column.name])).toEqual([
      ['type-10', 'Racks'],
      ['warehouse-', 'Other']
    ])
    expect(locationColumns([slot(1, 'Yard')], undefined).map(column => column.name)).toEqual([
      'Yard'
    ])
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
  it('knows no limit is passed by a package of unknown weight', () => {
    expect(overPackageLimit(null, 0)).toBe(false)
  })

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
    expect(benchLocations([spot(404), spot(405, true)], slot(405), null).pendingId).toBeNull()
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

  it('reads another department’s cell from the order’s own locations', () => {
    const clicked = { location_id: 36, name: 'B-03', remaining_weight: 2000 } as LocationSlot
    const own = { location_id: 36, name: 'B-03', remaining_weight: 1866.47 } as OrderLocation
    expect(packageTarget(clicked, [own], []).slot?.remaining_weight).toBe(1866.47)
  })

  it('goes where the order already stands when nothing is picked', () => {
    const elsewhere = { location_id: 12, name: 'A-01', current: false } as OrderLocation
    const current = {
      location_id: 36,
      name: 'B-03',
      current: true,
      remaining_weight: 50
    } as OrderLocation
    const { target, slot } = packageTarget(null, [elsewhere, current], undefined)
    expect(target).toBe(current)
    expect(slot).toBe(current)
    expect(packageTarget(null, undefined, undefined)).toEqual({ target: null, slot: null })
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
