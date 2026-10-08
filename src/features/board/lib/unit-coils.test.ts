import { describe, expect, it } from 'vitest'
import { coilSummary, fillEntries, unitCoils, unitRuns } from './unit-coils'

const line = {
  supplier: 'COLSTE',
  coil_number: null,
  supplier_locked: true,
  coil_number_locked: false,
  unit_coils: [
    {
      unit: 2,
      supplier: 'SAMSUNG',
      coil_number: 'J46A211',
      supplier_locked: true,
      coil_number_locked: true
    }
  ]
}

describe('unitCoils', () => {
  it("a unit with no coil of its own takes the line's", () => {
    const units = unitCoils(line, 3)
    expect(units.map(unit => [unit.unit, unit.supplier, unit.coil_number])).toEqual([
      [1, 'COLSTE', null],
      [2, 'SAMSUNG', 'J46A211'],
      [3, 'COLSTE', null]
    ])
  })
})

describe('unitRuns', () => {
  it('reads units as runs', () => {
    expect(unitRuns([5, 1, 2, 3, 7, 8])).toBe('1–3, 5, 7–8')
  })
})

describe('coilSummary', () => {
  it('one text per coil, with its units', () => {
    expect(coilSummary(unitCoils(line, 3))).toEqual([
      'Units 1, 3: COLSTE / Undefined',
      'Unit 2: SAMSUNG / J46A211'
    ])
  })
})

describe('fillEntries', () => {
  it('fills each unit and keeps what the Manager locked', () => {
    const missing = unitCoils(line, 3).filter(unit => !unit.coil_number)
    expect(fillEntries('102', missing, { supplier: 'AKZO', coilNumber: 'F7601268' })).toEqual([
      { origin_item: '102', unit: 1, supplier: 'COLSTE', coil_number: 'F7601268' },
      { origin_item: '102', unit: 3, supplier: 'COLSTE', coil_number: 'F7601268' }
    ])
  })

  it('a line not split by coil is one entry', () => {
    expect(fillEntries('102', null, { supplier: 'AKZO', coilNumber: 'X1' })).toEqual([
      { origin_item: '102', supplier: 'AKZO', coil_number: 'X1' }
    ])
  })
})
