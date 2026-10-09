import { describe, expect, it } from 'vitest'
import type { DayStripEntry } from '../api'
import { dayLoad, dayLoadHint, dayUsed } from './format'

const day = (entry: Partial<DayStripEntry>): DayStripEntry => ({
  date: '2026-10-08',
  pieces: 0,
  pieces_from_stock: 0,
  bends: 0,
  bends_from_stock: 0,
  capacity: null,
  capacity_unit: 'bends',
  used: 0,
  over_capacity: false,
  is_work_day: true,
  holiday: null,
  ...entry
})

describe('dayLoad', () => {
  it("Trim's bends read bare, as on the board", () => {
    expect(dayLoad(day({ used: 2710, capacity: 5000 }))).toBe('2710 / 5000')
  })

  it('Trim with no Daily Max keeps the slash', () => {
    expect(dayLoad(day({ used: 21 }))).toBe('21 / —')
  })

  it("Rollforming's feet are whole and say their unit", () => {
    expect(dayLoad(day({ capacity_unit: 'linear_feet', used: 1240.56, capacity: 5000 }))).toBe(
      '1241 / 5000 ft'
    )
  })

  it('Accessories with no capacity reads its pieces alone', () => {
    expect(dayLoad(day({ capacity_unit: 'pieces', used: 12 }))).toBe('12 pcs')
  })
})

describe('dayUsed', () => {
  it('leaves the capacity out, in the unit the pill uses', () => {
    expect(dayUsed(day({ capacity_unit: 'linear_feet', used: 1033.4, capacity: 1000 }))).toBe(
      '1033 ft'
    )
  })

  it("Trim's bends stay bare", () => {
    expect(dayUsed(day({ used: 2710, capacity: 5000 }))).toBe('2710')
  })
})

describe('dayLoadHint', () => {
  it('names the unit and the warning', () => {
    expect(
      dayLoadHint(day({ capacity_unit: 'pieces', used: 320, capacity: 300, over_capacity: true }))
    ).toBe('320 of 300 pieces scheduled — over the daily capacity')
  })
})
