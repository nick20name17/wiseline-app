import type { Dept } from '../lib/types'

/**
 * U unscheduled, S scheduled, R reviewed, L released, C cut, B bent, P part wrapped, W wrapped,
 * D completed. One department's progress through an order; `C` and `B` are Trim's machines.
 */
export type Stage = 'U' | 'S' | 'R' | 'L' | 'C' | 'B' | 'P' | 'W' | 'D'

type LineOpts = {
  stock?: number
  vent?: boolean
  /** Rollforming coil: from the Slit Line (`slit` done, `wait` owed) or none named yet. */
  coil?: 'slit' | 'wait' | 'none'
  /** A day of its own, for a part-scheduled order; `null` stays on Unscheduled. */
  day?: number | null
}

export type LineSpec = [
  product: string,
  qty: number,
  color: string | null,
  gauge: number | null,
  length?: number | null,
  opts?: LineOpts
]

export type Plan = {
  stage: Stage
  /** Work days from today. */
  day?: number
  prio?: number
  byp?: boolean
  /** Days ago the department finished the order (stage D). */
  done?: number
  lines: LineSpec[]
}

export type TripPlan = {
  truck: number
  /** Work days from today. */
  day: number
  /** `null`: on the truck, not yet on a Load. */
  load: number | null
  status?: string
}

export type OrderPlan = {
  no: number | string
  cust: string
  /** Work days from today. */
  ship: number
  via?: 'Delivery' | 'Pickup'
  po?: string | null
  rep: string
  /** Days ago the order reached EBMS. */
  made?: number
  note?: { text: string; ago: number; read?: boolean }
  plans: Partial<Record<Dept, Plan>>
  trip?: TripPlan
  /** Left the plant long ago: still in Completed, no longer in Shipping. */
  gone?: boolean
}

export const customers: Record<string, { address: string; city: string; state: string }> = {
  'Summit Roofing & Exteriors': { address: '418 Ridge Rd', city: 'Dublin', state: 'OH' },
  'Hartwell Builders': { address: '2200 Industrial Way', city: 'Columbus', state: 'OH' },
  'Pioneer Metal Supply': { address: '75 Foundry St', city: 'Newark', state: 'OH' },
  'Cedar Valley Construction': { address: '9120 Cedar Valley Dr', city: 'Delaware', state: 'OH' },
  'Northgate Contractors': { address: '1305 Northgate Blvd', city: 'Westerville', state: 'OH' },
  'Bluebird Home Improvement': { address: '58 Bluebird Ln', city: 'Hilliard', state: 'OH' },
  'Anderson & Sons Roofing': { address: '3342 Harrison Ave', city: 'Lancaster', state: 'OH' },
  'Keystone Pole Barns': { address: '6710 State Route 37', city: 'Marysville', state: 'OH' },
  'Lakeshore Siding Co.': { address: '210 Shoreline Dr', city: 'Gahanna', state: 'OH' },
  'Redwood Exteriors': { address: '884 Sawmill Pkwy', city: 'Grove City', state: 'OH' },
  'Mesa Steel Buildings': { address: '4501 Alton Rd', city: 'Columbus', state: 'OH' },
  'Granite Peak Homes': { address: '17 Quarry Hill Rd', city: 'Powell', state: 'OH' }
}

const BLK = 'BLACK'
const CHR = 'CHARCOAL GRAY'
const BNW = 'BONE WHITE'
const CLY = 'CLAY'
const SLT = 'BURNISHED SLATE'
const GRN = 'HUNTER GREEN'
const GLV = 'GALVALUME'
const MBK = 'MATTE BLACK'
const RED = 'BRITE RED'

// Orders are listed newest first, as EBMS hands them over.
export const orderPlans: OrderPlan[] = [
  // --- Unscheduled: nothing decided yet ------------------------------------------------------
  {
    no: 41247,
    cust: 'Granite Peak Homes',
    ship: 6,
    po: 'GP-0912',
    rep: 'Priya Nair',
    made: 0,
    plans: {
      1: {
        stage: 'U',
        lines: [
          ['DRIP-EDGE-A', 180, BNW, 24],
          ['RAKE-TRIM-5', 96, BNW, 24],
          ['CORNER-OUT-4', 28, BNW, 24, 120]
        ]
      }
    }
  },
  {
    no: 41246,
    cust: 'Mesa Steel Buildings',
    ship: 7,
    po: 'MSB-7710',
    rep: 'Tom Brennan',
    made: 0,
    note: { text: 'Panels must be shipped uncrated, bundled in 20s.', ago: 0 },
    plans: {
      2: {
        stage: 'U',
        lines: [
          ['SS-15', 48, SLT, 26, 216],
          ['SS-15', 24, SLT, 26, 144],
          ['TUFF-RIB', 60, SLT, 26, 192]
        ]
      },
      3: {
        stage: 'U',
        lines: [
          ['CLIP-SS-15', 12, null, null],
          ['SCR-15-HWH', 20, SLT, null],
          ['TOUCHUP-PAINT', 3, SLT, null]
        ]
      }
    }
  },
  {
    no: 41244,
    cust: 'Redwood Exteriors',
    ship: 5,
    po: 'RW-2290',
    rep: 'Elena Ruiz',
    made: 1,
    plans: {
      1: {
        stage: 'U',
        lines: [
          ['FASCIA-6', 110, GRN, 26],
          ['J-CHANNEL-34', 140, GRN, 26]
        ]
      },
      2: { stage: 'U', lines: [['CORR-78', 36, GRN, 26, 120]] },
      3: {
        stage: 'U',
        lines: [
          ['SCR-1-HWH', 10, GRN, null],
          ['BUTYL-TAPE', 8, null, null],
          ['SEALANT-CLR', 6, null, null]
        ]
      }
    }
  },
  {
    no: 41243,
    cust: 'Lakeshore Siding Co.',
    ship: 4,
    po: null,
    rep: 'Marcus Hale',
    made: 1,
    plans: {
      1: {
        stage: 'U',
        lines: [
          ['J-CHANNEL-34', 220, CLY, 29],
          ['BASE-TRIM-3', 90, CLY, 29],
          ['CORNER-OUT-4', 40, CLY, 29, 120]
        ]
      }
    }
  },
  {
    no: 41241,
    cust: 'Keystone Pole Barns',
    ship: 5,
    po: 'KPB-318',
    rep: 'Tom Brennan',
    made: 1,
    plans: { 2: { stage: 'U', lines: [['TUFF-RIB', 140, CHR, 26, 192]] } }
  },
  {
    no: 41240,
    cust: 'Anderson & Sons Roofing',
    ship: 4,
    po: 'AS-5521',
    rep: 'Priya Nair',
    made: 2,
    plans: {
      2: {
        stage: 'U',
        lines: [
          ['CORR-78', 60, GLV, 29, 120],
          ['CORR-78', 40, GLV, 29, 96]
        ]
      },
      3: {
        stage: 'U',
        lines: [
          ['FOAM-CL-TR', 30, null, null],
          ['SCR-1-HWH', 14, null, null]
        ]
      }
    }
  },
  {
    no: 41238,
    cust: 'Bluebird Home Improvement',
    ship: 3,
    po: 'BHI-880',
    rep: 'Elena Ruiz',
    made: 2,
    plans: {
      1: {
        stage: 'U',
        lines: [
          ['DRIP-CAP', 160, GRN, 26],
          ['GABLE-TRIM', 52, GRN, 26]
        ]
      },
      3: {
        stage: 'U',
        lines: [
          ['SCR-1-HWH', 6, GRN, null],
          ['PIPE-BOOT-3', 4, null, null]
        ]
      }
    }
  },
  {
    no: 41237,
    cust: 'Northgate Contractors',
    ship: 6,
    po: 'NGC-1204',
    rep: 'Marcus Hale',
    made: 2,
    plans: {
      1: { stage: 'U', lines: [['RIDGE-FLAT', 64, SLT, 26]] },
      2: {
        stage: 'U',
        lines: [
          ['SS-15', 30, SLT, 26, 192],
          ['SS-15', 18, SLT, 26, 120]
        ]
      }
    }
  },
  {
    no: 41236,
    cust: 'Pioneer Metal Supply',
    ship: 2,
    via: 'Pickup',
    po: 'PMS-4412',
    rep: 'Tom Brennan',
    made: 3,
    note: { text: 'Will Call. Customer collects after 2 pm, bring the dolly.', ago: 1 },
    plans: {
      1: {
        stage: 'U',
        lines: [
          ['EAVE-TRIM', 200, BNW, 24, 144],
          ['EAVE-TRIM', 120, BLK, 24, 144]
        ]
      }
    }
  },
  {
    no: 41234,
    cust: 'Cedar Valley Construction',
    ship: 5,
    po: 'CV-7003',
    rep: 'Priya Nair',
    made: 3,
    plans: {
      1: {
        stage: 'U',
        lines: [
          ['SIDEWALL-FL', 90, GLV, 26],
          ['ENDWALL-FL', 70, GLV, 26],
          ['VALLEY-W', 36, GLV, 26]
        ]
      }
    }
  },
  {
    no: 41233,
    cust: 'Hartwell Builders',
    ship: 3,
    po: 'HB-2208',
    rep: 'Marcus Hale',
    made: 3,
    plans: {
      1: {
        stage: 'U',
        lines: [
          ['DRIP-EDGE-A', 260, BLK, 24],
          ['RAKE-TRIM-5', 120, BLK, 24],
          ['FASCIA-6', 80, BLK, 24]
        ]
      },
      3: { stage: 'U', lines: [['SEALANT-CLR', 10, null, null]] }
    }
  },
  {
    no: 41231,
    cust: 'Summit Roofing & Exteriors',
    ship: 4,
    po: 'JOB-4471',
    rep: 'Elena Ruiz',
    made: 4,
    note: { text: 'Job site has a 2 ton forklift only. Keep bundles under 2,000 lb.', ago: 2 },
    plans: {
      1: {
        stage: 'U',
        lines: [
          ['DRIP-EDGE-A', 150, BLK, 24],
          ['RAKE-TRIM-5', 80, BLK, 24],
          ['FASCIA-6', 64, BLK, 24]
        ]
      },
      2: { stage: 'U', lines: [['TUFF-RIB', 40, BLK, 26, 144]] },
      3: {
        stage: 'U',
        lines: [
          ['SCR-1-HWH', 12, BLK, null],
          ['BUTYL-TAPE', 6, null, null],
          ['FOAM-CL-TR', 8, null, null],
          ['TOUCHUP-PAINT', 2, BLK, null]
        ]
      }
    }
  },
  {
    no: 'S1044',
    cust: 'Stock',
    ship: 8,
    rep: 'Dana Wells',
    made: 0,
    plans: {
      1: {
        stage: 'U',
        lines: [
          ['DRIP-EDGE-A', 300, BLK, 24],
          ['J-CHANNEL-34', 250, BNW, 24],
          ['RAKE-TRIM-5', 150, CHR, 26]
        ]
      }
    }
  },

  // --- Scheduled, still being reviewed -------------------------------------------------------
  {
    no: 41228,
    cust: 'Anderson & Sons Roofing',
    ship: 3,
    po: 'AS-5498',
    rep: 'Priya Nair',
    made: 5,
    plans: {
      2: {
        stage: 'S',
        day: 1,
        prio: 8,
        lines: [
          ['TUFF-RIB', 80, CHR, 26, 180, { coil: 'none' }],
          ['DIAMOND-RIB', 50, CHR, 26, 144, { coil: 'none' }]
        ]
      },
      3: {
        stage: 'S',
        day: 2,
        lines: [
          ['SCR-1-HWH', 16, CHR, null],
          ['FOAM-CL-TR', 40, null, null]
        ]
      }
    }
  },
  {
    no: 41227,
    cust: 'Redwood Exteriors',
    ship: 5,
    po: 'RW-2271',
    rep: 'Elena Ruiz',
    made: 5,
    plans: {
      1: {
        stage: 'S',
        day: 2,
        prio: 5,
        lines: [
          ['EAVE-TRIM', 90, MBK, 24, 144],
          ['GABLE-TRIM', 60, MBK, 24],
          ['DRIP-CAP', 120, MBK, 24, 120, { day: null }]
        ]
      }
    }
  },
  {
    no: 41226,
    cust: 'Summit Roofing & Exteriors',
    ship: 3,
    po: 'JOB-4455',
    rep: 'Elena Ruiz',
    made: 6,
    plans: {
      1: {
        stage: 'R',
        day: 1,
        prio: 3,
        lines: [
          ['DRIP-EDGE-A', 140, CHR, 26],
          ['FASCIA-6', 70, CHR, 26, 120, { stock: 20 }],
          ['VALLEY-W', 24, CHR, 26]
        ]
      },
      2: {
        stage: 'R',
        day: 1,
        prio: 7,
        lines: [
          ['TUFF-RIB', 56, CHR, 26, 168],
          ['TUFF-RIB', 28, CHR, 26, 120]
        ]
      }
    }
  },
  {
    no: 41225,
    cust: 'Hartwell Builders',
    ship: 4,
    po: 'HB-2190',
    rep: 'Marcus Hale',
    made: 6,
    plans: {
      1: {
        stage: 'S',
        day: 1,
        prio: 2,
        lines: [
          ['SIDEWALL-FL', 150, GLV, 26],
          ['RIDGE-FLAT', 48, GLV, 26],
          ['J-CHANNEL-34', 100, GLV, 26]
        ]
      }
    }
  },
  {
    no: 41224,
    cust: 'Pioneer Metal Supply',
    ship: 0,
    po: 'PMS-4390',
    rep: 'Tom Brennan',
    made: 8,
    note: { text: 'Customer called twice, needs this before Friday.', ago: 1 },
    plans: {
      1: {
        stage: 'S',
        day: -2,
        prio: 1,
        lines: [
          ['CORNER-OUT-4', 60, BNW, 24, 120],
          ['BASE-TRIM-3', 140, BNW, 24]
        ]
      }
    }
  },
  {
    no: 41229,
    cust: 'Mesa Steel Buildings',
    ship: 5,
    po: 'MSB-7702',
    rep: 'Tom Brennan',
    made: 5,
    plans: {
      2: {
        stage: 'R',
        day: 2,
        prio: 8,
        lines: [
          ['SS-15', 40, SLT, 26, 240],
          ['SS-15', 40, SLT, 26, 192, { coil: 'wait' }],
          ['CORR-78', 30, GLV, 29, 120, { coil: 'none' }]
        ]
      },
      3: { stage: 'S', day: 3, lines: [['CLIP-SS-15', 10, null, null]] }
    }
  },

  // --- Released: on the floor today and tomorrow ---------------------------------------------
  {
    no: 41219,
    cust: 'Summit Roofing & Exteriors',
    ship: 1,
    po: 'JOB-4430',
    rep: 'Elena Ruiz',
    made: 9,
    plans: {
      1: {
        stage: 'L',
        day: 0,
        prio: 2,
        lines: [
          ['DRIP-EDGE-A', 200, BLK, 24],
          ['RAKE-TRIM-5', 100, BLK, 24],
          ['J-CHANNEL-34', 120, BLK, 24, 120, { stock: 30 }]
        ]
      },
      2: {
        stage: 'L',
        day: 0,
        prio: 7,
        lines: [
          ['TUFF-RIB', 90, BLK, 26, 192],
          ['TUFF-RIB', 45, BLK, 26, 120]
        ]
      },
      3: {
        stage: 'L',
        day: 0,
        lines: [
          ['SCR-1-HWH', 18, BLK, null],
          ['BUTYL-TAPE', 10, null, null]
        ]
      }
    }
  },
  {
    no: 41218,
    cust: 'Cedar Valley Construction',
    ship: 1,
    po: 'CV-6990',
    rep: 'Priya Nair',
    made: 9,
    plans: {
      1: {
        stage: 'C',
        day: 0,
        prio: 3,
        lines: [
          ['EAVE-TRIM', 150, CLY, 29, 144],
          ['GABLE-TRIM', 80, CLY, 29],
          ['DRIP-CAP', 90, CLY, 29]
        ]
      }
    }
  },
  {
    no: 41217,
    cust: 'Bluebird Home Improvement',
    ship: 1,
    po: 'BHI-861',
    rep: 'Elena Ruiz',
    made: 10,
    plans: {
      1: {
        stage: 'B',
        day: 0,
        prio: 4,
        lines: [
          ['FASCIA-6', 90, GRN, 26],
          ['J-CHANNEL-34', 130, GRN, 26, 120, { stock: 20 }],
          ['CORNER-OUT-4', 30, GRN, 26, 120]
        ]
      },
      3: { stage: 'L', day: 0, lines: [['SCR-1-HWH', 8, GRN, null]] }
    }
  },
  {
    no: 41216,
    cust: 'Northgate Contractors',
    ship: 2,
    po: 'NGC-1190',
    rep: 'Marcus Hale',
    made: 10,
    plans: {
      1: {
        stage: 'L',
        day: 1,
        prio: 6,
        lines: [
          ['SIDEWALL-FL', 110, SLT, 26],
          ['ENDWALL-FL', 110, SLT, 26],
          ['VALLEY-W', 30, SLT, 26, 120, { vent: true }]
        ]
      },
      2: {
        stage: 'L',
        day: 1,
        prio: 8,
        lines: [
          ['SS-15', 64, SLT, 26, 216],
          ['SS-15', 36, SLT, 26, 144, { coil: 'slit' }]
        ]
      }
    }
  },
  {
    no: 41215,
    cust: 'Keystone Pole Barns',
    ship: 2,
    po: 'KPB-301',
    rep: 'Tom Brennan',
    made: 11,
    plans: {
      2: {
        stage: 'L',
        day: 0,
        prio: 9,
        lines: [
          ['TUFF-RIB', 120, GLV, 29, 240],
          ['CORR-78', 70, GLV, 29, 144]
        ]
      },
      3: { stage: 'L', day: 1, lines: [['SNOW-GUARD', 24, null, null]] }
    }
  },
  {
    no: 41214,
    cust: 'Lakeshore Siding Co.',
    ship: 1,
    po: 'LS-3318',
    rep: 'Marcus Hale',
    made: 11,
    plans: {
      1: {
        stage: 'L',
        day: 0,
        prio: 1,
        byp: true,
        lines: [
          ['J-CHANNEL-34', 60, BNW, 24],
          ['BASE-TRIM-3', 40, BNW, 24]
        ]
      }
    }
  },
  {
    no: 'S1041',
    cust: 'Stock',
    ship: 2,
    rep: 'Dana Wells',
    made: 5,
    plans: {
      1: {
        stage: 'B',
        day: 0,
        prio: 5,
        lines: [
          ['DRIP-EDGE-A', 200, MBK, 24],
          ['FASCIA-6', 90, BLK, 24],
          ['RIDGE-FLAT', 80, GLV, 26]
        ]
      }
    }
  },

  // --- At the packing bench ------------------------------------------------------------------
  {
    no: 41212,
    cust: 'Hartwell Builders',
    ship: 1,
    po: 'HB-2150',
    rep: 'Marcus Hale',
    made: 12,
    plans: {
      1: {
        stage: 'P',
        day: -1,
        prio: 2,
        lines: [
          ['DRIP-EDGE-A', 80, CHR, 26],
          ['RAKE-TRIM-5', 40, CHR, 26],
          ['FASCIA-6', 40, CHR, 26]
        ]
      },
      3: {
        stage: 'P',
        day: -1,
        lines: [
          ['SEALANT-CLR', 8, null, null],
          ['SCR-1-HWH', 10, CHR, null]
        ]
      }
    }
  },
  {
    no: 41211,
    cust: 'Anderson & Sons Roofing',
    ship: 1,
    po: 'AS-5470',
    rep: 'Priya Nair',
    made: 12,
    plans: {
      2: {
        stage: 'P',
        day: -1,
        prio: 7,
        lines: [
          ['TUFF-RIB', 30, BNW, 26, 192],
          ['TUFF-RIB', 20, BNW, 26, 144],
          ['DIAMOND-RIB', 16, BNW, 26, 120]
        ]
      }
    }
  },
  {
    no: 41210,
    cust: 'Redwood Exteriors',
    ship: 1,
    po: 'RW-2240',
    rep: 'Elena Ruiz',
    made: 13,
    plans: {
      1: {
        stage: 'W',
        day: -1,
        prio: 3,
        lines: [
          ['GABLE-TRIM', 24, BLK, 24],
          ['EAVE-TRIM', 20, BLK, 24, 144]
        ]
      },
      2: { stage: 'W', day: -1, prio: 8, lines: [['CORR-78', 24, BLK, 26, 120]] }
    }
  },
  {
    no: 41209,
    cust: 'Granite Peak Homes',
    ship: 1,
    po: 'GP-0890',
    rep: 'Priya Nair',
    made: 13,
    plans: {
      3: {
        stage: 'W',
        day: -1,
        lines: [
          ['POP-RIVET-18', 6, null, null],
          ['PIPE-BOOT-3', 5, null, null],
          ['SEALANT-CLR', 12, null, null]
        ]
      }
    }
  },

  // --- Completed, on a truck or waiting for one ---------------------------------------------
  {
    no: 41190,
    cust: 'Granite Peak Homes',
    ship: 0,
    po: 'GP-0871',
    rep: 'Priya Nair',
    made: 16,
    plans: {
      1: {
        stage: 'D',
        day: -3,
        done: 1,
        prio: 3,
        lines: [
          ['DRIP-EDGE-A', 120, CLY, 29],
          ['RAKE-TRIM-5', 60, CLY, 29]
        ]
      },
      3: { stage: 'D', day: -3, done: 1, lines: [['SCR-1-HWH', 8, CLY, null]] }
    },
    trip: { truck: 1, day: 0, load: 1, status: 'loading' }
  },
  {
    no: 41189,
    cust: 'Hartwell Builders',
    ship: 0,
    po: 'HB-2122',
    rep: 'Marcus Hale',
    made: 16,
    note: { text: 'Gate code 4471, unload at the north bay.', ago: 3, read: true },
    plans: {
      1: {
        stage: 'D',
        day: -3,
        done: 1,
        prio: 2,
        lines: [
          ['SIDEWALL-FL', 40, BLK, 24],
          ['J-CHANNEL-34', 50, BLK, 24]
        ]
      },
      2: { stage: 'D', day: -3, done: 1, prio: 7, lines: [['TUFF-RIB', 16, BLK, 26, 168]] }
    },
    trip: { truck: 1, day: 0, load: 1, status: 'loading' }
  },
  {
    no: 41188,
    cust: 'Cedar Valley Construction',
    ship: 0,
    po: 'CV-6944',
    rep: 'Priya Nair',
    made: 17,
    plans: {
      1: {
        stage: 'D',
        day: -3,
        done: 1,
        prio: 4,
        lines: [
          ['EAVE-TRIM', 50, GRN, 26, 144],
          ['DRIP-CAP', 60, GRN, 26]
        ]
      }
    },
    trip: { truck: 1, day: 0, load: 1, status: 'loading' }
  },
  {
    no: 41187,
    cust: 'Summit Roofing & Exteriors',
    ship: 0,
    po: 'JOB-4402',
    rep: 'Elena Ruiz',
    made: 17,
    plans: {
      2: { stage: 'D', day: -3, done: 1, prio: 7, lines: [['SS-15', 24, SLT, 26, 192]] },
      3: {
        stage: 'D',
        day: -3,
        done: 1,
        lines: [
          ['CLIP-SS-15', 6, null, null],
          ['SCR-15-HWH', 8, SLT, null]
        ]
      }
    },
    trip: { truck: 1, day: 0, load: 2, status: 'unreleased' }
  },
  {
    no: 41186,
    cust: 'Keystone Pole Barns',
    ship: 0,
    po: 'KPB-288',
    rep: 'Tom Brennan',
    made: 18,
    plans: {
      2: { stage: 'D', day: -2, done: 1, prio: 9, lines: [['TUFF-RIB', 24, GLV, 29, 240]] }
    },
    trip: { truck: 1, day: 0, load: null }
  },
  {
    no: 41185,
    cust: 'Bluebird Home Improvement',
    ship: 0,
    po: 'BHI-840',
    rep: 'Elena Ruiz',
    made: 18,
    plans: {
      1: {
        stage: 'D',
        day: -2,
        done: 1,
        prio: 5,
        lines: [
          ['GABLE-TRIM', 30, BNW, 24],
          ['FASCIA-6', 30, BNW, 24]
        ]
      }
    },
    trip: { truck: 2, day: 0, load: 1, status: 'not_started' }
  },
  {
    no: 41184,
    cust: 'Lakeshore Siding Co.',
    ship: 0,
    po: 'LS-3290',
    rep: 'Marcus Hale',
    made: 19,
    plans: {
      1: { stage: 'D', day: -2, done: 2, prio: 6, lines: [['J-CHANNEL-34', 90, SLT, 26]] },
      3: { stage: 'D', day: -2, done: 2, lines: [['SEALANT-CLR', 6, null, null]] }
    },
    trip: { truck: 2, day: 0, load: 1, status: 'not_started' }
  },
  {
    no: 41183,
    cust: 'Redwood Exteriors',
    ship: 0,
    po: 'RW-2201',
    rep: 'Elena Ruiz',
    made: 19,
    plans: {
      2: { stage: 'D', day: -2, done: 2, prio: 8, lines: [['CORR-78', 30, GLV, 29, 144]] }
    },
    trip: { truck: 3, day: 0, load: 1, status: 'en_route' }
  },
  {
    no: 41182,
    cust: 'Anderson & Sons Roofing',
    ship: 0,
    po: 'AS-5433',
    rep: 'Priya Nair',
    made: 20,
    plans: {
      1: { stage: 'D', day: -3, done: 2, prio: 3, lines: [['RIDGE-FLAT', 70, GLV, 26]] }
    },
    trip: { truck: 3, day: 0, load: 1, status: 'en_route' }
  },
  {
    no: 41181,
    cust: 'Mesa Steel Buildings',
    ship: -1,
    po: 'MSB-7655',
    rep: 'Tom Brennan',
    made: 21,
    plans: {
      1: { stage: 'D', day: -5, done: 3, prio: 2, lines: [['VALLEY-W', 40, CHR, 26]] },
      2: { stage: 'D', day: -5, done: 3, prio: 8, lines: [['SS-15', 44, CHR, 26, 216]] }
    },
    trip: { truck: 3, day: -1, load: 1, status: 'completed' }
  },
  {
    no: 41180,
    cust: 'Northgate Contractors',
    ship: 1,
    po: 'NGC-1160',
    rep: 'Marcus Hale',
    made: 21,
    plans: {
      1: { stage: 'D', day: -4, done: 2, prio: 4, lines: [['DRIP-EDGE-A', 140, SLT, 26]] }
    },
    trip: { truck: 1, day: 1, load: null }
  },
  {
    no: 41179,
    cust: 'Pioneer Metal Supply',
    ship: 1,
    po: 'PMS-4366',
    rep: 'Tom Brennan',
    made: 22,
    plans: {
      2: { stage: 'D', day: -4, done: 2, prio: 9, lines: [['TUFF-RIB', 30, BLK, 26, 144]] }
    },
    trip: { truck: 2, day: 1, load: 1, status: 'unreleased' }
  },
  {
    no: 41178,
    cust: 'Summit Roofing & Exteriors',
    ship: 2,
    po: 'JOB-4388',
    rep: 'Elena Ruiz',
    made: 22,
    plans: {
      1: {
        stage: 'D',
        day: -4,
        done: 2,
        prio: 3,
        lines: [
          ['FASCIA-6', 50, BLK, 24],
          ['RAKE-TRIM-5', 50, BLK, 24]
        ]
      },
      2: { stage: 'D', day: -4, done: 2, prio: 7, lines: [['DIAMOND-RIB', 12, BLK, 26, 168]] }
    }
  },
  {
    no: 41177,
    cust: 'Hartwell Builders',
    ship: 2,
    po: 'HB-2101',
    rep: 'Marcus Hale',
    made: 23,
    plans: {
      1: { stage: 'D', day: -4, done: 2, prio: 5, lines: [['EAVE-TRIM', 130, CHR, 26, 144]] }
    }
  },
  {
    no: 41176,
    cust: 'Granite Peak Homes',
    ship: 1,
    via: 'Pickup',
    po: 'GP-0850',
    rep: 'Priya Nair',
    made: 23,
    plans: {
      3: {
        stage: 'D',
        day: -4,
        done: 2,
        lines: [
          ['TOUCHUP-PAINT', 4, BNW, null],
          ['POP-RIVET-18', 3, null, null]
        ]
      }
    }
  },

  // --- Finished and gone: only the Completed tabs remember them ------------------------------
  {
    no: 41170,
    cust: 'Cedar Valley Construction',
    ship: -6,
    po: 'CV-6890',
    rep: 'Priya Nair',
    made: 30,
    gone: true,
    plans: {
      1: {
        stage: 'D',
        day: -9,
        done: 7,
        prio: 3,
        lines: [
          ['DRIP-EDGE-A', 100, BLK, 24],
          ['GABLE-TRIM', 60, BLK, 24]
        ]
      }
    }
  },
  {
    no: 41168,
    cust: 'Keystone Pole Barns',
    ship: -7,
    po: 'KPB-270',
    rep: 'Tom Brennan',
    made: 32,
    gone: true,
    plans: {
      2: { stage: 'D', day: -10, done: 8, prio: 9, lines: [['TUFF-RIB', 160, GLV, 29, 240]] },
      3: { stage: 'D', day: -10, done: 8, lines: [['SCR-1-HWH', 14, null, null]] }
    }
  },
  {
    no: 41165,
    cust: 'Redwood Exteriors',
    ship: -10,
    po: 'RW-2150',
    rep: 'Elena Ruiz',
    made: 36,
    gone: true,
    plans: {
      1: {
        stage: 'D',
        day: -13,
        done: 11,
        prio: 2,
        lines: [
          ['VALLEY-W', 36, GRN, 26],
          ['RIDGE-FLAT', 44, GRN, 26]
        ]
      }
    }
  },
  {
    no: 41160,
    cust: 'Lakeshore Siding Co.',
    ship: -14,
    po: 'LS-3201',
    rep: 'Marcus Hale',
    made: 40,
    gone: true,
    plans: {
      1: {
        stage: 'D',
        day: -17,
        done: 15,
        prio: 6,
        lines: [
          ['J-CHANNEL-34', 200, CLY, 29],
          ['CORNER-OUT-4', 30, CLY, 29, 120]
        ]
      }
    }
  },
  {
    no: 41155,
    cust: 'Mesa Steel Buildings',
    ship: -20,
    po: 'MSB-7590',
    rep: 'Tom Brennan',
    made: 46,
    gone: true,
    plans: {
      2: {
        stage: 'D',
        day: -23,
        done: 21,
        prio: 8,
        lines: [
          ['SS-15', 90, SLT, 26, 240],
          ['CORR-78', 40, RED, 26, 120]
        ]
      }
    }
  }
]
