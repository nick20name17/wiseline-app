import { describe, expect, it } from 'vitest'
import type { CoilFilter, CoilLot } from '../api'
import {
  coilFilterActive,
  coilName,
  departmentCoilFilter,
  filterFor,
  feetFromThickness,
  fieldText,
  passesCoilFilter,
  poundsPerFoot,
  thicknessFromFeet
} from './coils'

const filter = (patch: Partial<CoilFilter> = {}): CoilFilter => ({
  id: 1,
  folder_autoid: null,
  folder_name: null,
  thickness_min: null,
  thickness_max: null,
  width_min: null,
  width_max: null,
  grade_min: null,
  grade_max: null,
  apply_all: false,
  ...patch
})

const lot = (patch: Partial<CoilLot> = {}): CoilLot => ({
  id: 41,
  lot_autoid: 'LOT-41',
  lot_number: '3782201',
  product_id: 'CB4826R',
  color: 'Charcoal',
  gauge: 26,
  width: 48,
  folder_id: 'F26',
  coil_thickness: 5.95,
  material_thickness: 0.0179,
  core_od: 20,
  linear_feet: 2260,
  weight: 6608,
  in_trim: false,
  in_rollforming: false,
  in_slinet: false,
  note: null,
  can_adjust: true,
  slinet_available: false,
  rollforming_available: true,
  ...patch
})

describe('the coil filter', () => {
  it('is the department-wide row, not a folder’s', () => {
    const own = filter({ id: 2 })
    expect(departmentCoilFilter([filter({ folder_autoid: 'F26' }), own])).toBe(own)
    expect(departmentCoilFilter([filter({ folder_autoid: 'F26' })])).toBeNull()
  })

  it('narrows nothing when every range is Apply All', () => {
    expect(coilFilterActive(filter())).toBe(false)
    expect(coilFilterActive(filter({ apply_all: true, thickness_min: 1 }))).toBe(false)
    expect(passesCoilFilter(lot(), null)).toBe(true)
  })

  it('keeps a coil whose thickness is inside the range, and one not yet measured', () => {
    const range = filter({ thickness_min: 5, thickness_max: 6 })
    expect(passesCoilFilter(lot(), range)).toBe(true)
    expect(passesCoilFilter(lot({ coil_thickness: 3 }), range)).toBe(false)
    expect(passesCoilFilter(lot({ coil_thickness: null }), range)).toBe(true)
  })
})

describe('the coil geometry', () => {
  it('turns Linear Feet into a Coil Thickness and back', () => {
    const thickness = thicknessFromFeet(2260, 0.0179, 20)
    expect(thickness).toBeCloseTo(5.95, 1)
    expect(Math.abs(feetFromThickness(thickness, 0.0179, 20) - 2260)).toBeLessThan(10)
  })

  it('reads pounds per foot off the coil, scaled by the Material Thickness', () => {
    expect(poundsPerFoot(lot(), 0.0179)).toBeCloseTo(6608 / 2260)
    expect(poundsPerFoot(lot(), 0.0358)).toBeCloseTo((2 * 6608) / 2260)
    expect(poundsPerFoot(lot({ weight: null }), 0.0179)).toBeNull()
  })
})

describe('the coil as the floor reads it', () => {
  it('is named by its coil #, or its row when EBMS sent none', () => {
    expect(coilName(lot())).toBe('3782201')
    expect(coilName(lot({ lot_number: null }))).toBe('41')
  })

  it('leaves a missing figure blank rather than writing null', () => {
    expect(fieldText(null)).toBe('')
    expect(fieldText(0)).toBe('0')
  })
})

describe('a folder’s own filter', () => {
  it('wins over the department-wide one for its coils only', () => {
    const wide = filter({ id: 1 })
    const own = filter({ id: 2, folder_autoid: 'F26' })

    expect(filterFor(lot(), [wide, own])).toBe(own)
    expect(filterFor(lot({ folder_id: 'F29' }), [wide, own])).toBe(wide)
  })

  it('tests the width leg now that a coil carries it', () => {
    expect(passesCoilFilter(lot({ width: 48 }), filter({ width_min: 40, width_max: 50 }))).toBe(
      true
    )
    expect(passesCoilFilter(lot({ width: 60 }), filter({ width_min: 40, width_max: 50 }))).toBe(
      false
    )
  })
})
