/** The shapes the prototype's Accessories store holds, named as it names them. */

export type Note = {
  id: number
  author: string
  email: string
  ts: string
  body: string
  dealt: boolean
  source?: string
}

export type Priority = {
  id: number
  name: string
  cls: string
  hierarchy: number
}

export type Occupant = {
  orderId: number
  weight: number
}

export type Location = {
  id: number
  wh: number
  dept: string
  code: string
  maxWeight: number
  /** Above 1 the location is Multi-Order and stays selectable until it hits this cap or its weight. */
  maxOrders: number
  occupants: Occupant[]
}

export type LineItem = {
  id: number
  productId: string
  description: string
  qtyOrdered: number
  leftToPackage: number
  /** The operator's staged amount for the package being built, not a persisted quantity. */
  packaging: number
  unitWeight: number
  /** Set on a split order's lines only — which Prep Date this one was scheduled for. */
  scheduledDate: string | null
  notes: Note[]
}

export type PackageItem = {
  itemId: number
  productId: string
  qty: number
}

export type Package = {
  id: number
  code: string
  seq: number
  weight: number
  locationId: number | null
  items: PackageItem[]
  deleted: boolean
}

export type Order = {
  id: number
  orderNumber: string
  customer: string
  po: string
  salesman: string
  /** Its absence is what makes an order unscheduled. */
  prepDate: string | null
  shipVia: string
  truck: string | null
  priorityId: number | null
  /** 0 means no limit. */
  maxPkgWeight: number
  pkgSeq: number
  locationIds: number[]
  packages: Package[]
  orderNotes: Note[]
  items: LineItem[]
  /** Some lines scheduled and some not, so the order sits in both lists at once. */
  isSplit?: boolean
  completed?: boolean
  completedDate?: string
}

export type AccessoriesState = {
  role: string
  activeTab: string
  search: string
  expandedIds: number[]
  selectedOrderIds: number[]
  /** Scoped to one order: only one order can be split at a time. */
  selectedLineIds: number[]
  splitOrderId: number | null
  scheduledDay: string | null
  locations: Location[]
  priorities: Priority[]
  orders: Order[]
  [key: string]: unknown
}
