import { describe, expect, it } from 'vitest'
import type { DayStripEntry } from '../api'
import { dayLoad, dayLoadHint, dayUsed, formatWidth } from './format'

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

describe('formatWidth', () => {
  it('keeps the width as ordered rather than rounding it to a tenth', () => {
    expect(formatWidth(4.25)).toBe('4.25')
    expect(formatWidth(9.6875)).toBe('9.6875')
    expect(formatWidth(10.03125)).toBe('10.03125')
  })

  it('drops trailing zeros', () => {
    expect(formatWidth(4)).toBe('4')
    expect(formatWidth(12.5)).toBe('12.5')
  })
})
