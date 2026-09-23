import type { CoilFilter, CoilLot } from '../api'

/** How the floor names a coil: its coil #, or the row id for one EBMS sent without it. */
export const coilName = (lot: CoilLot) => lot.lot_number ?? String(lot.id)

/** A stored figure as a number box holds it — blank for none, never «null». */
export const fieldText = (value: number | null) => (value === null ? '' : String(value))

/** The department-wide row — the one the Coil Filter window writes. */
export const departmentCoilFilter = (filters: CoilFilter[] | undefined) =>
  filters?.find(filter => !filter.folder_autoid) ?? null

/** A folder's own filter wins over the department-wide one for the coils in that folder. */
export const filterFor = (lot: CoilLot, filters: CoilFilter[] | undefined) =>
  filters?.find(filter => !!lot.folder_id && filter.folder_autoid === lot.folder_id) ??
  departmentCoilFilter(filters)

const bounded = (min: number | null, max: number | null) => min !== null || max !== null

export const coilFilterActive = (filter: CoilFilter | null): filter is CoilFilter =>
  !!filter &&
  !filter.apply_all &&
  (bounded(filter.thickness_min, filter.thickness_max) ||
    bounded(filter.width_min, filter.width_max) ||
    bounded(filter.grade_min, filter.grade_max))

/**
 * A blank value has nothing to range-test, so it passes rather than fails: a coil EBMS has only just
 * pushed in must not vanish for want of a measurement.
 */
const withinLeg = (value: number | null, min: number | null, max: number | null) =>
  value === null || ((min === null || value >= min) && (max === null || value <= max))

/**
 * "When the Thickness, Width and Grade ALL fall within the ranges set in the filter, then that coil will
 * show up in the Coils tab." A lot carries no grade yet (see TODO.md), so that leg passes.
 */
export const passesCoilFilter = (lot: CoilLot, filter: CoilFilter | null) =>
  !coilFilterActive(filter) ||
  (withinLeg(lot.coil_thickness, filter.thickness_min, filter.thickness_max) &&
    withinLeg(lot.width, filter.width_min, filter.width_max))

// --- Coil geometry -------------------------------------------------------

/**
 * A wound coil's steel fills the annulus between the core and the outer diameter, so Coil Thickness —
 * the radial build-up on the roll — is what ties Linear Feet to Material Thickness and Core OD. It moves
 * with the square root of the length, not in proportion to it, which is why the three fields
 * cross-adjust rather than scale.
 */
export const thicknessFromFeet = (feet: number, material: number, core: number) =>
  +((Math.sqrt(core * core + (48 * material * feet) / Math.PI) - core) / 2).toFixed(2)

export const feetFromThickness = (thickness: number, material: number, core: number) => {
  const outer = core + 2 * thickness
  return Math.round((Math.PI * (outer * outer - core * core)) / (48 * material))
}

/**
 * Pounds per foot of this coil at a given Material Thickness, read off the coil's own current figures
 * and scaled by the thickness — the board gives no steel density to work it out from width. A coil
 * with no weight or length on record has nothing to read it from.
 */
export const poundsPerFoot = (lot: CoilLot, material: number) =>
  lot.weight && lot.linear_feet && lot.material_thickness
    ? (lot.weight / lot.linear_feet) * (material / lot.material_thickness)
    : null
