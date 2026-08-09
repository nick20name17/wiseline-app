import { canonicalCoils, type Coil } from '@/store/shared/coils'

import { createStore } from '@/store/create-store'

import seed from './seed.json'

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

export type CoilsState = {
  coils: Coil[]
  search: string
  /** all | trim | rollforming | slinetIn | lowstock */
  filter: string
  expandedGroups: string[]
  activeFolder: string
  folderFilter: CoilFilter
}

export type CoilGroup = {
  key: string
  productId: string
  color: string
  gauge: number | null
  width: number
  coils: Coil[]
}

export const LOW_STOCK_LF = 1000

/** The EBMS folders the Coils tab tabs across; the tab order is EBMS's, not the coil list's. */
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

export const FILTER_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'trim', label: 'Trim' },
  { key: 'rollforming', label: 'Rollforming' },
  { key: 'slinetIn', label: 'Slinet in' },
  { key: 'lowstock', label: 'Low stock' }
]

export type UsageLine = {
  customer: string
  so: string
  item: string
  length: string
  qty: number
}

/**
 * N-111: the customer line items and Sales Orders using each coil size, keyed by product id.
 *
 * It is not part of the coil record and not persisted — the Total column reads it to show a piece
 * count, and the drill-in modal reads the same entry.
 */
export const COIL_USAGE: Record<string, { length: string; lines: UsageLine[] }> = {
  CB4826C: {
    length: "10'",
    lines: [
      {
        customer: 'Arnold Contracting',
        so: 'SO-10432',
        item: '26Ga Tuff Rib Panel',
        length: "10'",
        qty: 18
      },
      {
        customer: 'D&P Roofing Inc.',
        so: 'SO-10450',
        item: '26Ga Tuff Rib Panel',
        length: "12'",
        qty: 26
      }
    ]
  },
  CB4826R: {
    length: "12'",
    lines: [
      { customer: 'R P Kim', so: 'SO-10398', item: '26Ga Tuff Rib Panel', length: "12'", qty: 14 }
    ]
  },
  CB4826W: {
    length: "10'",
    lines: [
      { customer: 'Josh Toole', so: 'SO-10411', item: '26Ga Tuff Rib Panel', length: "8'", qty: 9 },
      {
        customer: 'Ontario Metal Products Ltd.',
        so: 'SO-10467',
        item: '26Ga Tuff Rib Panel',
        length: "10'",
        qty: 22
      },
      {
        customer: 'Spright Construction',
        so: 'SO-10478',
        item: '26Ga Tuff Rib Panel',
        length: "14'",
        qty: 6
      }
    ]
  },
  CB4824G: {
    length: "16'",
    lines: [
      {
        customer: 'Arnold Contracting',
        so: 'SO-10405',
        item: '24Ga Tuff Rib Panel',
        length: "16'",
        qty: 31
      }
    ]
  },
  CB4824W: {
    length: "12'",
    lines: [
      { customer: 'R P Kim', so: 'SO-10440', item: '24Ga Tuff Rib Panel', length: "12'", qty: 17 }
    ]
  },
  CB4826H: {
    length: "10'",
    lines: [
      {
        customer: 'D&P Roofing Inc.',
        so: 'SO-10455',
        item: '26Ga Tuff Rib Panel',
        length: "10'",
        qty: 12
      }
    ]
  },
  CB2928C: {
    length: '10\'6"',
    lines: [
      {
        customer: 'Josh Toole',
        so: 'CL-2291',
        item: '28Ga Trim — Ridge Cap',
        length: '10\'6"',
        qty: 8
      }
    ]
  },
  CB3626G: {
    length: '10\'6"',
    lines: [
      {
        customer: 'Ontario Metal Products Ltd.',
        so: 'CL-2305',
        item: '26Ga Trim — Rake',
        length: '10\'6"',
        qty: 15
      }
    ]
  },
  CB3626C: {
    length: '10\'6"',
    lines: [
      {
        customer: 'Arnold Contracting',
        so: 'CL-2312',
        item: '26Ga Trim — Drip Edge',
        length: '10\'6"',
        qty: 4
      }
    ]
  },
  CB3624W: {
    length: "12'",
    lines: [
      {
        customer: 'Spright Construction',
        so: 'CL-2320',
        item: '24Ga Trim — Board & Batten',
        length: "12'",
        qty: 22
      }
    ]
  },
  CB4828B: {
    length: "10'",
    lines: [
      {
        customer: 'R P Kim',
        so: 'SO-10488',
        item: '28Ga Colorbond Flat Stock',
        length: "10'",
        qty: 11
      }
    ]
  },
  CB4826S: {
    length: "10'",
    lines: [
      {
        customer: 'Ontario Metal Products Ltd.',
        so: 'SO-10491',
        item: '26Ga Stainless Flat Stock',
        length: "10'",
        qty: 6
      }
    ]
  },
  CB4824S: {
    length: "12'",
    lines: [
      {
        customer: 'Arnold Contracting',
        so: 'SO-10495',
        item: '24Ga Stainless Flat Stock',
        length: "12'",
        qty: 4
      }
    ]
  }
}

const seeded = seed as unknown as CoilsState

/**
 * This page is the source of truth for `wl_coils_v1`: Trim and Rollforming read the list it writes.
 * A stored list is preferred over the seed, and when there is none the seed is published so the other
 * departments hydrate from the same records rather than inventing their own.
 */
const hydrated = canonicalCoils.get()
if (!hydrated) canonicalCoils.set(seeded.coils)

export const coilsStore = createStore<CoilsState>({
  ...seeded,
  coils: hydrated?.length ? hydrated : seeded.coils
})

coilsStore.subscribe(() => canonicalCoils.set(coilsStore.get().coils))

export const groupKey = (coil: Coil) =>
  `${coil.productId}|${coil.color}|${coil.gauge}|${coil.width}`

/**
 * EBMS folder qualification: a coil shows under its folder when Thickness, Width and Grade all fall
 * in range. Each attribute's own Apply All drops its leg, and a coil whose Coil Thickness has not
 * been set yet always passes — there is nothing to range-test.
 */
export const coilPassesLeg = (
  value: number | null,
  min: string,
  max: string,
  applyAll: boolean
) => {
  if (applyAll) return true
  if (value == null) return true

  const lo = min === '' ? -Infinity : parseFloat(min)
  const hi = max === '' ? Infinity : parseFloat(max)
  return !(value < lo || value > hi)
}

export const passesRangeFilter = (coil: Coil, filter: CoilFilter) =>
  coilPassesLeg(coil.thickness, filter.thicknessMin, filter.thicknessMax, filter.thicknessAll) &&
  coilPassesLeg(coil.width, filter.widthMin, filter.widthMax, filter.widthAll) &&
  coilPassesLeg(coil.grade, filter.gradeMin, filter.gradeMax, filter.gradeAll)

export const coilFilterActive = (filter: CoilFilter) =>
  !(filter.thicknessAll && filter.widthAll && filter.gradeAll)

export const coilsInRange = (state: CoilsState) =>
  state.coils.filter(coil => passesRangeFilter(coil, state.folderFilter))

export const qualifyingFolders = (state: CoilsState) => {
  const present = new Set(coilsInRange(state).map(coil => coil.folder))
  return COIL_FOLDERS.filter(folder => present.has(folder))
}

export const filteredCoils = (state: CoilsState) => {
  let list = coilsInRange(state)
  if (state.activeFolder !== 'all') list = list.filter(coil => coil.folder === state.activeFolder)

  if (state.filter === 'trim') list = list.filter(coil => coil.locTrim)
  else if (state.filter === 'rollforming') list = list.filter(coil => coil.locRollforming)
  else if (state.filter === 'slinetIn') list = list.filter(coil => coil.slinetIn)
  else if (state.filter === 'lowstock') list = list.filter(coil => coil.linearFeet < LOW_STOCK_LF)

  const query = state.search.trim().toLowerCase()
  if (query)
    list = list.filter(coil =>
      `${coil.productId} ${coil.color} ${coil.coilNumber} ${coil.supplier}`
        .toLowerCase()
        .includes(query)
    )

  return list
}

export const buildGroups = (list: Coil[]): CoilGroup[] => {
  const map: Record<string, CoilGroup> = {}

  list.forEach(coil => {
    const key = groupKey(coil)
    map[key] ??= {
      key,
      productId: coil.productId,
      color: coil.color,
      gauge: coil.gauge,
      width: coil.width,
      coils: []
    }
    map[key].coils.push(coil)
  })

  return Object.values(map).sort(
    (a, b) => a.color.localeCompare(b.color) || a.productId.localeCompare(b.productId)
  )
}

export const setSearch = (search: string) => coilsStore.set({ search })
export const setFilter = (filter: string) => coilsStore.set({ filter })
export const setActiveFolder = (activeFolder: string) => coilsStore.set({ activeFolder })

export const toggleGroup = (key: string) =>
  coilsStore.set(state => ({
    expandedGroups: state.expandedGroups.includes(key)
      ? state.expandedGroups.filter(other => other !== key)
      : [...state.expandedGroups, key]
  }))

/** Slinet needs a Coil Thickness and a coil checked into Trim; the button is disabled without both. */
export const slinetEligible = (coil: Coil) =>
  coil.thickness != null && coil.thickness > 0 && coil.locTrim

/** A coil mounted in the Slinet cannot be moved to Rollforming until it comes off. */
export const rfEligible = (coil: Coil) => !(coil.locTrim && coil.slinetIn)

export const toggleSlinet = (id: Coil['id']) =>
  coilsStore.set(state => {
    const coil = state.coils.find(other => other.id === id)
    if (!coil || !slinetEligible(coil)) return {}

    return {
      coils: state.coils.map(other =>
        other.id === id ? { ...other, slinetIn: !other.slinetIn } : other
      )
    }
  })

export const DEPT_FLAG_LABEL: Record<string, string> = {
  locTrim: 'Trim',
  locRollforming: 'Rollforming'
}

export type DeptFlag = 'locTrim' | 'locRollforming'

/**
 * N-117: the inventory is shared but a coil is checked into one department at a time, so setting one
 * location clears the other. Slinet requires Trim, so leaving Trim — or arriving in Rollforming —
 * takes the coil off the Slinet as well.
 */
export const moveCoilLocation = (id: Coil['id'], flag: DeptFlag) =>
  coilsStore.set(state => ({
    coils: state.coils.map(coil => {
      if (coil.id !== id) return coil

      const other: DeptFlag = flag === 'locTrim' ? 'locRollforming' : 'locTrim'
      const leavingTrim = flag === 'locTrim' && coil.locTrim
      const enteringRf = flag === 'locRollforming' && !coil.locRollforming

      return {
        ...coil,
        [flag]: !coil[flag],
        [other]: false,
        slinetIn: leavingTrim || enteringRf ? false : coil.slinetIn
      }
    })
  }))

/** True when the move displaces the other department, which is what the prototype confirms first. */
export const moveNeedsConfirm = (coil: Coil, flag: DeptFlag) => {
  const other: DeptFlag = flag === 'locTrim' ? 'locRollforming' : 'locTrim'
  return !coil[flag] && coil[other]
}

export const setCoilNote = (id: Coil['id'], note: string) =>
  coilsStore.set(state => ({
    coils: state.coils.map(coil => (coil.id === id ? { ...coil, note } : coil))
  }))

export const removeCoil = (id: Coil['id']) =>
  coilsStore.set(state => ({ coils: state.coils.filter(coil => coil.id !== id) }))

export const usageQty = (productId: string) =>
  COIL_USAGE[productId]?.lines.reduce((total, line) => total + line.qty, 0) ?? 0

export const folderSlug = (value: string) => value.toLowerCase().replace(/\s+/g, '-')

/* -- geometry (#193) -------------------------------------------------------------------------- */

/**
 * A wound coil's steel fills the annulus between the core and the outer diameter, so Coil Thickness —
 * the radial build-up on the roll — is what ties Linear Feet to Material Thickness and Core OD. It
 * moves with the square root of the length, not in proportion to it, which is why the three fields
 * cross-adjust rather than scale.
 */
const STEEL_LB_IN3 = 0.2836

export const coilLbPerFoot = (width: number, matThk: number) => width * matThk * 12 * STEEL_LB_IN3

export const coilThicknessFromLf = (lf: number, matThk: number, coreOD: number) =>
  +((Math.sqrt(coreOD * coreOD + (48 * matThk * lf) / Math.PI) - coreOD) / 2).toFixed(2)

export const coilLfFromThickness = (thickness: number, matThk: number, coreOD: number) => {
  const od = coreOD + 2 * thickness
  return Math.round((Math.PI * (od * od - coreOD * coreOD)) / (48 * matThk))
}

export const coilWeightFromLf = (lf: number, width: number, matThk: number) =>
  Math.round(lf * coilLbPerFoot(width, matThk))

export const coilLfFromWeight = (weight: number, width: number, matThk: number) =>
  Math.round(weight / coilLbPerFoot(width, matThk))

export const ADJUST_FIELDS = [
  { key: 'thickness', label: 'Coil Thickness' },
  { key: 'linearFeet', label: 'Linear Feet' },
  { key: 'weight', label: 'Weight' }
] as const

export type AdjustField = (typeof ADJUST_FIELDS)[number]['key']

export const setCoilSetup = (
  id: Coil['id'],
  patch: { materialThickness?: number | null; coreOD?: number | null }
) =>
  coilsStore.set(state => ({
    coils: state.coils.map(coil => (coil.id === id ? { ...coil, ...patch } : coil))
  }))

export const applyCoilAdjust = (
  id: Coil['id'],
  patch: { thickness: number; linearFeet: number; weight: number }
) =>
  coilsStore.set(state => ({
    coils: state.coils.map(coil => (coil.id === id ? { ...coil, ...patch } : coil))
  }))

export const setFolderFilter = (folderFilter: CoilFilter) =>
  coilsStore.set({ folderFilter, activeFolder: 'all' })
