export const ROLES = ['admin', 'super_manager', 'manager', 'worker', 'driver', 'client'] as const

export type Role = (typeof ROLES)[number]

export const PROCESS_TYPES = ['production', 'dispatch', 'shipping', 'loading', 'driver'] as const

export type ProcessType = (typeof PROCESS_TYPES)[number]

export const PRODUCTION_TYPES = [
  'Rollforming',
  'Trim',
  'Accessories',
  'Standing Seam',
  'Board & Batten',
  'Flatstock'
] as const

export type ProductionType = (typeof PRODUCTION_TYPES)[number]

// A client only reads the board, which the label says plainly; the rest are named after the role.
const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  super_manager: 'Super manager',
  manager: 'Manager',
  worker: 'Worker',
  driver: 'Driver',
  client: 'View only'
}

const ROLE_TINTS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  super_manager: 'bg-pink-100 text-pink-700',
  manager: 'bg-amber-100 text-amber-700',
  worker: 'bg-green-100 text-green-700',
  driver: 'bg-red-100 text-red-700',
  client: 'bg-blue-100 text-blue-700'
}

const isRole = (role: string): role is Role => ROLES.includes(role as Role)

/** The API types the role as a plain string, so an unknown one still has to render. */
export const roleLabel = (role: string) => (isRole(role) ? ROLE_LABELS[role] : role || '—')

export const roleTint = (role: string) =>
  isRole(role) ? ROLE_TINTS[role] : 'bg-muted text-muted-foreground'

export const typeLabel = (type: string) => type.charAt(0).toUpperCase() + type.slice(1)
