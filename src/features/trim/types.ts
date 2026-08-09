import type { Coil } from '@/store/shared/coils'

/** The shapes the prototype's Trim store holds, named as it names them. */

export type Note = {
  id: number
  author: string
  email: string
  ts: string
  body: string
  dealt: boolean
}

export type Priority = {
  id: number
  name: string
  cls: string
  hierarchy: number
}

export type Machine = {
  id: number
  name: string
  dailyMax: number
}

export type LineItem = {
  id: number
  qty: number
  productId: string
  description: string
  gaugeColour: string
  width: number
  length: number
  machineId: number | null
  /** Pieces taken from stock instead of made, so they come off what the floor has to produce. */
  fromStock: number
  wrapped: number
  status: string | null
  /** Pieces flagged for venting; Slinet sorts on it (N-113). */
  vented: number
  /** Pieces already pushed to EBMS as a manufacturing batch — stock orders only. */
  qtyManufactured?: number
  /** Set per line only when an order is split-scheduled (N-006/007). */
  scheduledDate: string | null
  notes: Note[]
}

export type Order = {
  id: number
  order: string
  type: 'customer' | 'stock'
  customer: string
  entryDate: string
  shipDate: string | null
  priorityId: number | null
  reviewed: boolean
  released: boolean
  productionDate: string | null
  /** True when the order's lines sit on more than one day. */
  isSplit: boolean
  /** Skipped Slinet and the machines entirely — straight to Wrapping, so there is no review to do. */
  bypassed?: boolean
  completed?: boolean
  completedDate?: string
  completedTime?: string
  notes: Note[]
  lineItems: LineItem[]
  locationIds?: number[]
  packages?: {
    lineId: number
    qty: number
    seq?: number
    barcode?: string
    locId?: number | null
    deleted?: boolean
  }[]
}

export type Occupant = {
  orderId: number
  weight: number
  lastScanAt?: number
}

export type Location = {
  id: number
  code: string
  occupants?: Occupant[]
  [key: string]: unknown
}

export type TrimState = {
  role: string
  searchTerm: string
  priorities: Priority[]
  machines: Machine[]
  locations: Location[]
  orders: Order[]
  cutlists: Cutlist[]
  remans: Reman[]
  coils: Coil[]
  expandedIds: number[]
  selectedOrderIds: number[]
  selectedLineIds: number[]
  splitOrderId: number | null
  scheduledDay: string | null
  peekDay: string | null
  releaseIds: number[]
  activeMachine: number | null
  expandedCoilGroups: string[]
  prodMode: string
  prodListMode: string
  /**
   * Which batch cards are open. The prototype keeps this in a module-level `Set` beside its render
   * function; here it has to be state something re-renders on, and the store is where state lives.
   */
  expandedBatches: string[]
  /** Rows of a stock order's wrapping window ticked for the next manufacturing batch (#185). */
  stockWrapChecked: number[]
  [key: string]: unknown
}

export type Cutlist = {
  id: string
  date: string
  gaugeColour: string
  priorityId: number | null
  members: { orderId: number; lineId: number }[]
  slinetStarted?: boolean
  doneSlinet?: boolean
  doneMachines?: number[]
}

/** A recut raised against one line — it fans out to both the Slinet and the machine that raised it. */
export type Reman = {
  id: string
  orderId: number
  lineId: number
  orderNo: string
  productId: string
  description: string
  gaugeColour: string
  width: number
  length: number
  qty: number
  machineId: number
  priorityId: number | null
  date: string
  source: 'machine' | 'wrapping'
  fromCutlistId: string | null
  recut: boolean
  bent: boolean
  slinetDone: boolean
  machineDone: boolean
}
