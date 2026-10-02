import { machines } from './machines'

// [description, flat width (in), bends] — what EBMS knows of each Trim product.
export const TRIM: Record<string, [string, number, number]> = {
  'DRIP-EDGE-A': ['Drip Edge Type A', 8, 3],
  'J-CHANNEL-34': ['J-Channel 3/4"', 6.5, 3],
  'RAKE-TRIM-5': ['Rake Trim 5"', 10, 4],
  'FASCIA-6': ['Fascia 6"', 10.5, 4],
  'SIDEWALL-FL': ['Sidewall Flashing', 9, 2],
  'ENDWALL-FL': ['Endwall Flashing', 9, 2],
  'VALLEY-W': ['Valley 14" W', 14, 4],
  'RIDGE-FLAT': ['Flat Ridge Cap', 12, 2],
  'CORNER-OUT-4': ['Outside Corner 4x4', 11, 3],
  'BASE-TRIM-3': ['Base Trim 3"', 5, 2],
  'GABLE-TRIM': ['Gable Trim', 9, 3],
  'EAVE-TRIM': ['Eave Trim', 12, 4],
  'DRIP-CAP': ['Drip Cap', 4.5, 2]
}

// [description, coil width (in), EBMS profile]
export const PANELS: Record<string, [string, number, string]> = {
  'TUFF-RIB': ['Tuff Rib Panel', 42, 'Tuff Rib'],
  'DIAMOND-RIB': ['Diamond Rib Panel', 42, 'Diamond Rib'],
  'SS-15': ['Standing Seam 1.5" Panel', 42, 'Standing Seam 1.5'],
  'CORR-78': ['Corrugated 7/8" Panel', 42, 'Corrugated 7/8']
}

// [description, weight per unit (lb)]
export const ACCESSORIES: Record<string, [string, number]> = {
  'SCR-1-HWH': ['Screws 1" Hex Washer Head, bag of 250', 1.8],
  'SCR-15-HWH': ['Screws 1.5" Hex Washer Head, bag of 250', 2.4],
  'BUTYL-TAPE': ['Butyl Tape 1/8" x 3/4" x 45\'', 1.2],
  'FOAM-CL-TR': ['Outside Foam Closure Tuff Rib, 4 pc', 0.3],
  'PIPE-BOOT-3': ['Pipe Boot 1"-3"', 1.1],
  'SEALANT-CLR': ['Clear Sealant 10 oz', 0.9],
  'TOUCHUP-PAINT': ['Touch-up Paint 1/2 pt', 0.7],
  'POP-RIVET-18': ['Pop Rivets 1/8", box of 250', 1],
  'CLIP-SS-15': ['Standing Seam Clips 1.5", box of 100', 6.5],
  'SNOW-GUARD': ['Snow Guard Clamp-on', 0.8]
}

export const COLOR_CODE: Record<string, string> = {
  BLACK: 'BLK',
  'CHARCOAL GRAY': 'CHR',
  'BONE WHITE': 'BNW',
  CLAY: 'CLY',
  'BURNISHED SLATE': 'SLT',
  'HUNTER GREEN': 'GRN',
  GALVALUME: 'GLV',
  'MATTE BLACK': 'MBK',
  'BRITE RED': 'RED'
}

// Pounds per square foot of sheet steel by gauge.
export const PSF: Record<number, number> = { 24: 1.5625, 26: 1.1563, 29: 0.8906 }

export const machineForProfile = (profile: string) =>
  machines.find(machine => machine.ebms_profile_names.includes(profile))?.id ?? null
