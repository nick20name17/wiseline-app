import { MATERIAL_THICKNESS, coils as seedCoils, folders, type SeedCoil } from '../seed/coils'

export type CoilLot = SeedCoil & {
  material_thickness: number
  coil_thickness: number
  weight: number
}

export type CoilFilterRow = {
  id: number
  department: number
  folder_autoid: string | null
  thickness_min: number | null
  thickness_max: number | null
  width_min: number | null
  width_max: number | null
  grade_min: number | null
  grade_max: number | null
  apply_all: boolean
}

// Same relation the board's Coil Adjust window uses: the radial build-up of a wound coil.
export const thicknessFromFeet = (feet: number, material: number, core: number) =>
  +((Math.sqrt(core * core + (48 * material * feet) / Math.PI) - core) / 2).toFixed(2)

export const feetFromThickness = (thickness: number, material: number, core: number) => {
  const outer = core + 2 * thickness
  return Math.round((Math.PI * (outer * outer - core * core)) / (48 * material))
}

const poundsPerFoot = (coil: SeedCoil, material: number) => (coil.width * material * 490) / 144

export const coilLots: CoilLot[] = seedCoils.map(coil => {
  const material = MATERIAL_THICKNESS[coil.gauge] ?? 0.0179
  return {
    ...coil,
    material_thickness: material,
    coil_thickness: thicknessFromFeet(coil.linear_feet, material, coil.core_od),
    weight: Math.round(coil.linear_feet * poundsPerFoot(coil, material))
  }
})

export const coilFilters: CoilFilterRow[] = [
  {
    id: 1,
    department: 1,
    folder_autoid: null,
    thickness_min: 0.015,
    thickness_max: 0.03,
    width_min: 24,
    width_max: 48,
    grade_min: 33,
    grade_max: 80,
    apply_all: false
  },
  {
    id: 2,
    department: 2,
    folder_autoid: null,
    thickness_min: null,
    thickness_max: null,
    width_min: null,
    width_max: null,
    grade_min: null,
    grade_max: null,
    apply_all: true
  }
]

const within = (value: number, min: number | null, max: number | null) =>
  (min === null || value >= min) && (max === null || value <= max)

/** The coils a department's Coil Filter admits; no filter admits none. */
export const coilsForDepartment = (department: number) => {
  const filter = coilFilters.find(row => row.department === department && !row.folder_autoid)
  if (!filter) return []
  if (filter.apply_all) return coilLots
  return coilLots.filter(
    lot =>
      within(lot.material_thickness, filter.thickness_min, filter.thickness_max) &&
      within(lot.width, filter.width_min, filter.width_max) &&
      within(lot.grade, filter.grade_min, filter.grade_max)
  )
}

export const serializeCoil = (lot: CoilLot) => ({
  id: lot.id,
  lot_autoid: lot.id,
  lot_number: lot.lot_number,
  product_id: lot.product_id,
  color: lot.color,
  gauge: lot.gauge,
  width: lot.width,
  grade: lot.grade,
  // EBMS pads folder ids to the column width.
  folder_id: lot.folder_id.padEnd(8),
  coil_thickness: lot.coil_thickness,
  material_thickness: lot.material_thickness,
  core_od: lot.core_od,
  linear_feet: lot.linear_feet,
  weight: lot.weight,
  in_trim: lot.in_trim,
  in_rollforming: lot.in_rollforming,
  in_slinet: lot.in_slinet,
  note: lot.note,
  can_adjust: true,
  slinet_available: lot.width <= 48,
  rollforming_available: !lot.in_slinet
})

export const folderName = (id: string) => folders.find(row => row.folder_id === id)?.name ?? id
