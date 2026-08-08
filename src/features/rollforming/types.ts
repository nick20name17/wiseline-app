/** The shapes the prototype's Rollforming store holds, named as it names them. */

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
  /** The prototype's `h` — how hard the priority pulls an order up the Scheduled sort. */
  h: number
}

export type Supplier = { id: number; name: string }

/**
 * One ordered piece, not one coil in a warehouse: `lineItems[].coils` holds a row per piece, and a row
 * ticked as `stock` drops out of everything the floor has to roll.
 */
export type CoilUnit = {
  supplierId: number | null
  coilNumber: string
  needsSlit: boolean
  slitDone: boolean
  /** Set when the Worker filled in a Supplier/Coil Number the Manager left Undefined. */
  workerAssigned: boolean
  stock: boolean
}

export type LineItem = {
  id: number
  profile: string
  gauge: number
  thickness: number
  width: number
  color: string
  productId: string
  qty: number
  length: number | null
  linearFeet: number | null
  /** Maintained count of the `coils` rows ticked as stock. */
  fromStock: number
  /** Set per line only when an order is split-scheduled. */
  scheduledDate: string | null
  coils: CoilUnit[]
  notes: Note[]
}

export type Package = {
  seq: number
  barcode: string
  lineId: number
  qty: number
  locId: number | null
  customer: string
  order: string
  po: string
  deleted?: boolean
}

export type Order = {
  id: number
  order: string
  originType: 'sales_order' | 'material_request'
  requestedBy: string
  customer: string
  entryDate: string
  shipDate: string | null
  priorityId: number | null
  reviewed: boolean
  released: boolean
  exported: boolean
  productionDate: string | null
  /** True when the order's lines sit on more than one day. */
  isSplit: boolean
  notes: Note[]
  lineItems: LineItem[]
  packages: Package[]
  address: string
  city: string
  po: string
  salesman: string
  shipVia: string
  completedAt?: string
  /** Pre-release picks in the Scheduled grid, one column each. */
  exportSel?: boolean
  releaseSel?: boolean
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

/**
 * A coil as Rollforming holds one: grouped by the machine that rolls it, with an on-hand length and a
 * lot number. Deliberately not `@/store/shared/coils`' canonical shape — see the prototype's note on
 * the narrow bridge between the two.
 */
export type RfCoil = {
  id: number
  productId: string
  group: string
  color: string
  gauge: number
  width: number
  coilNumber: string
  lotNumber: string
  onHand: number
  received: string
  note?: string
  locTrim?: boolean
  locRollforming?: boolean
  slinetIn?: boolean
}

/** The coil checked into one rollformer, kept per machine group. */
export type CurrentCoil = {
  key: string
  supplierId: number | null
  coilNumber: string
  material: string
}

export type RollformingState = {
  role: string
  searchTerm: string
  activeGroup: string
  copiedCoilNumber: string | null
  priorities: Priority[]
  suppliers: Supplier[]
  locations: Location[]
  coils: RfCoil[]
  orders: Order[]
  currentCoilByGroup: Record<string, CurrentCoil | undefined>
  queueOrder: Record<string, string[]>
  sortByProductId: Record<number, boolean>
  expandedIds: number[]
  selectedOrderIds: number[]
  selectedLineIds: number[]
  splitOrderId: number | null
  scheduledDay: string | null
  expandedCoilsFolder: string
  selectedCoilCtx: { orderId: number; profile: string; units: string[] } | null
  [key: string]: unknown
}
