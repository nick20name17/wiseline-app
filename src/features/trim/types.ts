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
  [key: string]: unknown
}
