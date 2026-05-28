import type { Priority } from '../priorities/schema'

type SalesOrderStatus =
  | 'in_production'
  | 'production_completed'
  | 'wrapping'
  | 'wrapped'
  | 'dispatched'
  | 'delivered'
  | null

export interface SalesOrder {
  id: number
  order: string
  packages: number
  location: number
  priority: Priority
  production_date: string
  assigned: boolean
  release_to_production: boolean
  cutting_complete: boolean
  created_at: string
  status: SalesOrderStatus
}

export type SalesOrderCreatePayload = {
  order: string
  packages?: number
  location?: number
  priority?: number
  production_date?: string
  assigned?: boolean
  release_to_production?: boolean
  cutting_complete?: boolean
  created_at?: string
  status?: string
}

export interface SalesOrdersUpdatePayload {
  id: number
  payload: SalesOrderCreatePayload
}
