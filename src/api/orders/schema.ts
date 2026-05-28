import type { LatestAuditLog, OriginItem } from '../origin-items/schema'
import type { Priority } from '../priorities/schema'
import type { PaginationParams } from '../types'

export type ShipVia = 'Delivery' | 'Pickup'

export type OrderStatus =
  | 'in_production'
  | 'production_completed'
  | 'wrapping'
  | 'wrapped'
  | 'dispatched'
  | 'delivered'
  | null

export interface Order {
  id: string
  customer: string
  invoice: string
  c_country: string
  ship_date: string
  ship_via: ShipVia
  po_no: string
  salesman: string
  min_production_date: string | null
  max_production_date: string | null
  latest_location_id: number | null
  total_weight: number
  max_length: number
  e_date: string
  crea_date: string
  c_name: string
  c_city: string
  c_state: string
  c_address1: string
  count_items: number
  completed: boolean
  sales_order: SalesOrder
  origin_items: OriginItem[]
}

export interface SalesOrder {
  id: number
  order: string
  packages: number
  location: number
  priority: Priority | null
  status: OrderStatus
  production_date: string
  assigned: boolean
  release_to_production: boolean
  cutting_complete: boolean
  created_at: string
  latest_audit_logs: LatestAuditLog[]
}

export type OrdersSearchParams = Partial<
  {
    search: string
    is_scheduled: boolean
    flow_id: string
    cutting_complete: boolean
    category: string
    category__in: string
    status: OrderStatus
    status__in: string
    status__not_in: string
    ordering: string
    production_date: string
    release_to_production: boolean
  } & PaginationParams
>
