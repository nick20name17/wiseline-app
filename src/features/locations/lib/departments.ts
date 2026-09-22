import type { Department } from '../api'

// Shipping holds no racks of its own, so it has no location types or locations to list.
const RACKLESS = 'shipping'

/** The departments a location can belong to, in board order. */
export const rackedDepartments = (departments: Department[] | undefined) =>
  (departments ?? [])
    .filter(department => department.code !== RACKLESS)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id)

/** The department picked in the URL; none, or one that is not racked, means every department. */
export const activeDepartment = (departments: Department[], code: string | undefined) =>
  departments.find(department => department.code === code)
