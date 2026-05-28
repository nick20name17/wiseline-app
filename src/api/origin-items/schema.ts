import type { Flow } from '../flows/schema'
import type { OriginItemStatus } from '../items/schema'
import type { Priority } from '../priorities/schema'
import type { Stage } from '../stages/schema'
import type { ApiResponse, PaginationParams } from '../types'
import type { User } from '../users/schema'

export type OriginItemCategory =
  | 'Trim'
  | 'Accessories'
  | 'Rollforming'
  | 'Board & Batten'
  | 'Standing Seam'
  | (string & {})

export interface OriginItem {
  id: string
  category: OriginItemCategory
  description: string
  quantity: number
  shipped: number
  ship_date: string
  width: number
  weight: number
  length: number
  bends: number
  priority: Priority | null
  customer: string
  order: string
  id_inven: string
  production_date: string | null
  remanufacturing_qty: number
  remanufacturing_from_stock_qty: number
  package_qty: number
  origin_order: string
  completed: boolean
  profile: boolean
  color: string
  gauge: string
  c_type: number
  c_mfg: number
  on_hand: number
  item: Item | null
  cutting_items: OriginItem[]
}

export interface LatestAuditLog {
  model_field: string
  new_data: string
  created_at: string
  user: User
}

export type Item = {
  id: number
  used_stages: number[]
  over_due: boolean
  order: string
  origin_item: string
  flow: Flow | null
  production_date: string
  status: OriginItemStatus
  statuses: OriginItemStatus[]
  time: string
  pull_from_stock: number
  wrapped_from_stock: number
  wrapped_from_production: number
  packages: number
  location: number
  stage: Stage | null
  comments: Comment[]
  completed: boolean
  latest_audit_logs: LatestAuditLog[]
} | null

export interface Comment {
  id: number
  item: number
  text: string
  created_at: string
  user: User
}

export type OriginItemsSearchParams = Partial<
  {
    search: string
    category: string
    production_date: string
    is_scheduled: boolean
    cutting_complete: boolean
    release_to_production: boolean
    status: OriginItemStatus
    status__not_in: string
    status__in: string
    status__isnull: boolean
    flow_id__isnull: boolean
    is_wrapping: boolean
    flow_id: string
    is_cutting: boolean
    category__in: string
  } & PaginationParams
>

export type OriginItemsApiResponse = ApiResponse<OriginItem>
