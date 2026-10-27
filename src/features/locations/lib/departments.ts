import { inBoardOrder } from '@/lib/departments'
import type { Department } from '../api'

// Shipping holds no racks of its own, so it has no location types or locations to list.
const RACKLESS = 'shipping'

/** The departments a location can belong to, in board order. */
export const rackedDepartments = (departments: Department[] | undefined) =>
  inBoardOrder(departments).filter(department => department.code !== RACKLESS)
