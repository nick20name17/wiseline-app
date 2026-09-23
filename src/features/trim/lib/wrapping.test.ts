import { describe, expect, it } from 'vitest'
import type { LocationSlot } from '../api'
import { applyKeypad, packageContents, warehousesOf } from './wrapping'

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
