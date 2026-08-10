/** The shapes the prototype's Shipping store holds, named as it names them. */

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

export type Truck = {
  id: number
  location: string
  maxWeight: number
  maxLength: number
  notes: string
}

/** A load's status is the scan cascade the warehouse walks it through. */
export type LoadStatus =
  | 'unreleased'
  | 'notstarted'
  | 'loading'
  | 'loaded'
  | 'shipping'
  | 'shipped'
  | 'delivered'

export type Load = {
  id: number
  truckId: number
  date: string
  status: LoadStatus
  orderIds: number[]
  /** The delivery order the driver drives; the Manager sets it by dragging.  */
  sequence: number[]
  deliveryTerm: string
  loadUnloadTime: string
  vehicle: string
  /** The real model's aggregates, written whenever the status is recomputed from the orders. */
  is_loaded?: boolean
  is_shipped?: boolean
}

export type Order = {
  id: number
  entryDate: string
  /** Set only once the order is scheduled — its absence is what makes it unscheduled. */
  shipDate: string | null
  /** What the customer asked for, which is not what it was given. */
  reqShip?: string | null
  order: string
  customer: string
  address: string
  city: string
  weight: number
  longestLength: number
  shipVia: string
  priorityId: number | null
  /** The customer collects it, so it takes no space on a truck. */
  pickup: boolean
  truckId: number | null
  loadId: number | null
  status: LoadStatus | ''
  packages: { loaded: boolean }[]
  notes: Note[]
}

export type ShippingState = {
  search: string
  schSearch: string
  /** Shows the last note under every order that has one, across every view. */
  notesExpanded: boolean
  role: string
  priorities: Priority[]
  trucks: Truck[]
  orders: Order[]
  loads: Load[]
  selUnscheduled: number[]
  expUnscheduled: number[]
  expCompleted: number[]
  scheduledDay: string
  expTruck: number | null
  loadFilter: number | null
  selScheduled: number[]
  expScheduledRows: number[]
  loadingDay: string
  expLoadingTruck: number | null
  loadingSubTab: string
  expLoadingRows: number[]
  nextLoadId: number
  [key: string]: unknown
}
