import { coilFilterFor } from '@/store/shared/settings'

import { DEPARTMENT } from './store'

import type { Coil } from '@/store/shared/coils'

/**
 * #209: the Coil Filter is a *department* setting owned by that department's Manager, not a per-session
 * view toggle. It is stored under the department name so Trim's ranges can never narrow another
 * department's Coils tab (N-001), and so the Worker — who gets no filter button, the same way Priority
 * is read-only for him (N-002/N-057) — is filtered by exactly what his Manager set.
 */
export type CoilFilter = {
  thicknessMin: string
  thicknessMax: string
  thicknessAll: boolean
  widthMin: string
  widthMax: string
  widthAll: boolean
  gradeMin: string
  gradeMax: string
  gradeAll: boolean
}

export const EMPTY_COIL_FILTER: CoilFilter = {
  thicknessMin: '',
  thicknessMax: '',
  thicknessAll: true,
  widthMin: '',
  widthMax: '',
  widthAll: true,
  gradeMin: '',
  gradeMax: '',
  gradeAll: true
}

export const loadCoilFilter = (): CoilFilter => ({
  ...EMPTY_COIL_FILTER,
  ...(coilFilterFor(DEPARTMENT) as Partial<CoilFilter>)
})

export const coilFilterActive = (filter: CoilFilter) =>
  !(filter.thicknessAll && filter.widthAll && filter.gradeAll)

export const COIL_FOLDERS = [
  '24 Ga. B&B Coils',
  '24 Ga. Flat Stock Coils',
  '24 Ga. SS Coils',
  '26 Ga. B&B Coils',
  '26 Ga. Flat Stock Coils',
  '26 Ga. SS Coils',
  '28 Ga. Flat Stock Coils',
  '28 Ga. Flat Stock Coils Colorbond'
]

/**
 * From the canvas: a coil shows in its folder when Thickness, Width and Grade *all* fall inside the
 * ranges. A blank Coil Thickness has nothing to range-test, so it passes that leg rather than failing
 * it — a coil EBMS has only just pushed in must not vanish for want of a measurement.
 */
const passesLeg = (value: number | null, min: string, max: string, applyAll: boolean) => {
  if (applyAll) return true
  if (value == null) return true
  const low = min === '' ? -Infinity : parseFloat(min)
  const high = max === '' ? Infinity : parseFloat(max)
  return !(value < low || value > high)
}

export const coilInRange = (coil: Coil, filter: CoilFilter) =>
  passesLeg(coil.thickness, filter.thicknessMin, filter.thicknessMax, filter.thicknessAll) &&
  passesLeg(coil.width, filter.widthMin, filter.widthMax, filter.widthAll) &&
  passesLeg(coil.grade, filter.gradeMin, filter.gradeMax, filter.gradeAll)

/** A folder tab appears as soon as one coil in it qualifies — and in the canvas's folder order. */
export const qualifyingCoilFolders = (coils: Coil[], filter: CoilFilter) => {
  const present = new Set(coils.filter(coil => coilInRange(coil, filter)).map(coil => coil.folder))
  return COIL_FOLDERS.filter(folder => present.has(folder))
}

/** N-117a: a coil mounted in the Slinet cannot also be checked in to Rollforming. */
export const rfEligible = (coil: Coil) => !(coil.locTrim && coil.slinetIn)

export const slinetEligible = (coil: Coil) =>
  coil.thickness != null && coil.thickness > 0 && coil.locTrim
