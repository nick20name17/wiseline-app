export const ROLES = ['admin', 'super_manager', 'manager', 'worker', 'driver', 'client'] as const

export type Role = (typeof ROLES)[number]

// A client only reads the board, which the label says plainly; the rest are named after the role.
const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  super_manager: 'Super manager',
  manager: 'Manager',
  worker: 'Worker',
  driver: 'Driver',
  client: 'View only'
}

// One tint per role, so a row is read by colour before it is read by word.
const ROLE_TINTS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  super_manager: 'bg-pink-100 text-pink-700',
  manager: 'bg-amber-100 text-amber-700',
  worker: 'bg-green-100 text-green-700',
  driver: 'bg-red-100 text-red-700',
  client: 'bg-blue-100 text-blue-700'
}

const isRole = (role: string): role is Role => ROLES.includes(role as Role)

export const roleTint = (role: string) =>
  isRole(role) ? ROLE_TINTS[role] : 'bg-muted text-muted-foreground'

/** The API types the role as a plain string, so an unknown one still has to render. */
export const roleLabel = (role: string) => (isRole(role) ? ROLE_LABELS[role] : role || '—')

// Departments as the sidebar names them. Three are production lines, which the API keeps in
// `prod_types` under the `production` process; shipping is a process of its own.
export const DEPARTMENTS = ['Trim', 'Rollforming', 'Accessories', 'Shipping'] as const

export type Department = (typeof DEPARTMENTS)[number]

const PRODUCTION_LINES = new Set<string>(['Trim', 'Rollforming', 'Accessories'])

type UserTypes = { prod_types: string[]; process_types: string[] }

/** An admin reaches every department, so the API keeps no list for them. */
export const reachesEveryDepartment = (role: string) => role === 'admin'

export const toUserTypes = (role: Role, departments: Department[]): UserTypes => {
  if (role === 'driver') return { prod_types: [], process_types: ['driver'] }
  if (reachesEveryDepartment(role)) return { prod_types: [], process_types: [] }

  const lines = departments.filter(department => PRODUCTION_LINES.has(department))

  return {
    // A super manager watches every line rather than picking some.
    prod_types: role === 'super_manager' ? [] : lines,
    process_types: [
      ...(lines.length ? ['production'] : []),
      ...(departments.includes('Shipping') ? ['shipping'] : [])
    ]
  }
}

export const toDepartments = ({ prod_types, process_types }: UserTypes): Department[] =>
  DEPARTMENTS.filter(department =>
    department === 'Shipping' ? process_types.includes('shipping') : prod_types.includes(department)
  )
