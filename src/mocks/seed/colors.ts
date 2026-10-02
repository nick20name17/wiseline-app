export type SeedColor = {
  id: number | null
  name: string
  hex: string | null
  coil_colors: string[]
  coil_products: string[]
  in_ebms: boolean
}

// Coil colour texts as EBMS spells them, with how many coils carry each.
export const coilColorTexts = [
  { text: 'BLACK', coils: 14 },
  { text: 'BLK', coils: 3 },
  { text: 'CHARCOAL GRAY', coils: 9 },
  { text: 'BONE WHITE', coils: 11 },
  { text: 'BONE', coils: 2 },
  { text: 'CLAY', coils: 6 },
  { text: 'BURNISHED SLATE', coils: 5 },
  { text: 'MATTE BLACK', coils: 4 },
  { text: 'HUNTER GREEN', coils: 3 },
  { text: 'BRITE RED', coils: 2 },
  { text: 'GALVALUME', coils: 18 },
  { text: 'MILL FINISH', coils: 7 }
]

// Coil products EBMS gives no colour: the id is EBMS's, the description is what it prints.
export const coilProductList = [
  { product_id: 'PC-24-BLK', description: '24ga PVDF Black' },
  { product_id: 'PC-26-BLK', description: '26ga PVDF Black' },
  { product_id: 'PC-26-CHR', description: '26ga PVDF Charcoal' },
  { product_id: 'PC-29-CHR', description: '29ga PVDF Charcoal' },
  { product_id: 'PC-24-BNW', description: '24ga PVDF Bone White' },
  { product_id: 'PC-26-BNW', description: '26ga PVDF Bone White' },
  { product_id: 'PC-29-CLY', description: '29ga PVDF Clay' },
  { product_id: 'PC-26-SLT', description: '26ga PVDF Burnished Slate' },
  { product_id: 'PC-26-GRN', description: '26ga PVDF Hunter Green' },
  { product_id: 'GV-29-AZ50', description: '29ga Galvalume AZ50' },
  { product_id: 'GV-26-AZ50', description: '26ga Galvalume AZ50' }
]

export const colors: SeedColor[] = [
  {
    id: 1,
    name: 'Black',
    hex: '#1f2124',
    coil_colors: ['BLACK', 'BLK'],
    coil_products: ['PC-24-BLK', 'PC-26-BLK'],
    in_ebms: true
  },
  {
    id: 2,
    name: 'Charcoal',
    hex: '#4a4e53',
    coil_colors: ['CHARCOAL GRAY'],
    coil_products: ['PC-26-CHR', 'PC-29-CHR'],
    in_ebms: true
  },
  {
    id: 3,
    name: 'Bone White',
    hex: '#e8e2d0',
    coil_colors: ['BONE WHITE', 'BONE'],
    coil_products: ['PC-24-BNW', 'PC-26-BNW'],
    in_ebms: true
  },
  {
    id: 4,
    name: 'Clay',
    hex: '#a89a86',
    coil_colors: ['CLAY'],
    coil_products: ['PC-29-CLY'],
    in_ebms: true
  },
  {
    id: 5,
    name: 'Burnished Slate',
    hex: '#5b5d57',
    coil_colors: ['BURNISHED SLATE'],
    coil_products: ['PC-26-SLT'],
    in_ebms: true
  },
  {
    id: 6,
    name: 'Matte Black',
    hex: '#2b2b2b',
    coil_colors: ['MATTE BLACK'],
    coil_products: [],
    in_ebms: true
  },
  {
    id: 7,
    name: 'Hunter Green',
    hex: '#2f4a3a',
    coil_colors: ['HUNTER GREEN'],
    coil_products: ['PC-26-GRN'],
    in_ebms: true
  },
  {
    id: 8,
    name: 'Galvalume',
    hex: '#b9bcbf',
    coil_colors: ['GALVALUME'],
    coil_products: ['GV-29-AZ50', 'GV-26-AZ50'],
    in_ebms: true
  },
  // Trim EBMS knows by name that nothing has been saved for yet.
  {
    id: null,
    name: 'Brite Red',
    hex: null,
    coil_colors: [],
    coil_products: [],
    in_ebms: true
  },
  {
    id: null,
    name: 'Sandstone',
    hex: null,
    coil_colors: [],
    coil_products: [],
    in_ebms: true
  },
  // Kept here after the last trim that went by it left EBMS.
  {
    id: 9,
    name: 'Colonial Red',
    hex: '#7a2e2a',
    coil_colors: [],
    coil_products: [],
    in_ebms: false
  }
]
