/** The shared plant: one set of rows behind Trim, Rollforming, Accessories and Shipping. */
export type Dept = 1 | 2 | 3

export const DEPTS: Dept[] = [1, 2, 3]

export type ItemState = {
  id: number
  status: string | null
  production_date: string | null
  reviewed: boolean
  is_released: boolean
  exported_at: string | null
  /** The machine the Manager put the line on (Trim). */
  flow: number | null
  vented: boolean
  pull_from_stock: number | null
  width: number | null
  description: string | null
  supplier: string | null
  coil_number: string | null
  coil_icon: string | null
  coil_fields_locked: boolean
  bypassed: boolean
}

export type Line = {
  id: string
  order: string
  dept: Dept
  product_id: string
  description: string
  quantity: number
  shipped: number
  width: number | null
  length: number | null
  bends: number
  unit_weight: number
  color: string | null
  gauge: string | null
  profile: string | null
  /** The machine the EBMS profile runs on (Rollforming). */
  machine_id: number | null
  item: ItemState | null
}

export type DeptState = {
  id: number
  priority: number | null
  completed_at: string | null
}

export type Order = {
  id: string
  invoice: string
  customer: string | null
  ship_date: string
  crea_date: string
  ship_via: string
  po_no: string | null
  salesman: string
  address: string
  city: string
  state: string
  is_stock: boolean
  sales_order_id: number | null
  states: Partial<Record<Dept, DeptState>>
}

export type Pkg = {
  package_id: number
  name: string
  order: string
  department: Dept
  weight: number
  location_id: number | null
  is_loaded: boolean
  contents: { origin_item: string; quantity: number }[]
  created_at: string
}

export type Note = {
  id: number
  item: string
  text: string
  author: number
  created_at: string
  read: boolean
}

export type OrderNote = {
  text: string
  author: string
  created_at: string
  read_at: string | null
}
