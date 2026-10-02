export type SeedCoil = {
  id: string
  lot_number: string
  product_id: string
  supplier: string
  color: string
  gauge: number
  width: number
  grade: number
  folder_id: string
  core_od: number
  linear_feet: number
  in_trim: boolean
  in_rollforming: boolean
  in_slinet: boolean
  note: string | null
}

export const folders = [
  { folder_id: 'PP01', name: 'Prepainted PVDF' },
  { folder_id: 'GL01', name: 'Galvalume' },
  { folder_id: 'SL01', name: 'Slit coils' }
]

// Gauge to steel thickness in inches; what a coil's weight and build-up are worked out from.
export const MATERIAL_THICKNESS: Record<number, number> = { 24: 0.0239, 26: 0.0179, 29: 0.0136 }

const coil = (
  lot: string,
  product_id: string,
  color: string,
  gauge: number,
  width: number,
  supplier: string,
  feet: number,
  where: 'trim' | 'rollforming' | 'slinet' | null,
  extra: Partial<SeedCoil> = {}
): SeedCoil => ({
  id: `LOT${lot.replace('-', '')}`,
  lot_number: lot,
  product_id,
  supplier,
  color,
  gauge,
  width,
  grade: gauge === 24 ? 50 : 80,
  folder_id: product_id.startsWith('GV') ? 'GL01' : width < 24 ? 'SL01' : 'PP01',
  core_od: 20,
  linear_feet: feet,
  in_trim: where === 'trim',
  in_rollforming: where === 'rollforming',
  in_slinet: where === 'slinet',
  note: null,
  ...extra
})

// Lot numbers are the coil numbers Rollforming lines name; the lines' Supplier is the lot's.
export const coils: SeedCoil[] = [
  coil('26-0412', 'PC-24-BLK', 'BLACK', 24, 48, 'V1007', 1720, 'slinet'),
  coil('26-0418', 'PC-24-BLK', 'BLACK', 24, 48, 'V1007', 2010, 'trim', {
    note: 'Edge slightly wavy on the outer wrap'
  }),
  coil('26-0377', 'PC-26-BLK', 'BLACK', 26, 42, 'V1011', 3110, 'rollforming'),
  coil('26-0391', 'PC-26-BLK', 'BLACK', 26, 42, 'V1011', 4260, null),
  coil('26-0455', 'PC-26-CHR', 'CHARCOAL GRAY', 26, 42, 'V1004', 2890, 'rollforming'),
  coil('26-0456', 'PC-26-CHR', 'CHARCOAL GRAY', 26, 48, 'V1004', 2340, 'slinet'),
  coil('26-0302', 'PC-29-CHR', 'CHARCOAL GRAY', 29, 42, 'V1004', 5180, null),
  coil('26-0421', 'PC-24-BNW', 'BONE WHITE', 24, 48, 'V1007', 1480, 'slinet'),
  coil('26-0422', 'PC-26-BNW', 'BONE WHITE', 26, 42, 'V1007', 3770, 'rollforming'),
  coil('26-0388', 'PC-29-CLY', 'CLAY', 29, 48, 'V1002', 4520, 'slinet'),
  coil('26-0389', 'PC-29-CLY', 'CLAY', 29, 42, 'V1002', 4390, null),
  coil('26-0440', 'PC-26-SLT', 'BURNISHED SLATE', 26, 42, 'V1011', 2950, 'rollforming'),
  coil('26-0441', 'PC-26-SLT', 'BURNISHED SLATE', 26, 48, 'V1011', 3320, 'slinet'),
  coil('26-0467', 'PC-26-GRN', 'HUNTER GREEN', 26, 48, 'V1004', 2610, 'slinet'),
  coil('26-0468', 'PC-26-GRN', 'HUNTER GREEN', 26, 42, 'V1004', 1890, null),
  coil('26-0350', 'GV-29-AZ50', 'GALVALUME', 29, 42, 'V1008', 6120, 'rollforming'),
  coil('26-0351', 'GV-29-AZ50', 'GALVALUME', 29, 48, 'V1008', 5870, 'slinet'),
  coil('26-0360', 'GV-26-AZ50', 'GALVALUME', 26, 48, 'V1008', 3640, 'trim'),
  coil('26-0472', 'PC-26-BLK', 'BLACK', 26, 18, 'V1010', 1240, null, {
    note: 'Slit from 26-0391, 18" strips for gutter apron'
  }),
  coil('26-0473', 'PC-26-CHR', 'CHARCOAL GRAY', 26, 12, 'V1010', 980, null)
]
