import { isScoped, type Department, type Role } from './viewer'

/**
 * Which navigation items a viewer may see, and the label under «Viewing as».
 *
 * Three rules stack, in this order:
 *
 *  1. an allowlist per role — `null` means everything;
 *  2. Settings is admin-only, whatever the allowlist says;
 *  3. what a department's own people have no use for, even though their role allows it (#120/#121);
 *  4. a Manager or Worker scoped to one department sees that department's item and not the others'.
 *
 * A section label then disappears when everything under it has. This lives outside the department
 * features because every page in the prototype ships the same copy of it, and it decides what a
 * screenshot of any of them contains.
 */
const ALLOWED: Record<Role, string[] | null> = {
  admin: null,
  manager: null,
  worker: ['nav-trim', 'nav-rollforming', 'nav-accessories', 'nav-loading'],
  shipping: ['nav-dashboard', 'nav-shipping', 'nav-driver', 'nav-loading'],
  driver: ['nav-driver']
}

/**
 * #120/#121: Trim reads its coils inside its own Coils tab and its stock cards inside Unscheduled, so
 * the plant-wide items only repeat them; Driver, Loading and Warehouse are somebody else's job. The
 * Warehouse page itself stays — #119 asks what it is for, and only the Trim Manager's link is gone.
 */
const DENIED_BY_DEPARTMENT: Partial<Record<Role, Partial<Record<Department, string[]>>>> = {
  manager: {
    trim: ['nav-driver', 'nav-loading', 'nav-coils', 'nav-stockcards', 'nav-warehouse']
  },
  worker: { trim: ['nav-loading'] }
}

/** The four items that stand for a department, and so the ones department scoping narrows. */
const DEPARTMENT_NAV = ['nav-trim', 'nav-rollforming', 'nav-accessories', 'nav-shipping']

const NAV_OF_DEPARTMENT: Record<Exclude<Department, 'all'>, string> = {
  trim: 'nav-trim',
  rollforming: 'nav-rollforming',
  accessories: 'nav-accessories',
  shipping: 'nav-shipping'
}

/** The role's own name, with no department beside it — the Activity header's chip shows just this. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  worker: 'Worker',
  shipping: 'Shipping Manager',
  driver: 'Driver'
}

const DEPARTMENT_LABELS: Record<Department, string> = {
  all: 'All departments',
  trim: 'Trim',
  rollforming: 'Rollforming',
  accessories: 'Accessories',
  shipping: 'Shipping'
}

export const canSeeNav = (comment: string, role: Role, department: Department) => {
  const allowed = ALLOWED[role]
  if (allowed && !allowed.includes(comment)) return false
  if (comment === 'nav-settings' && role !== 'admin') return false
  if (DENIED_BY_DEPARTMENT[role]?.[department]?.includes(comment)) return false

  if (isScoped(role) && department !== 'all' && DEPARTMENT_NAV.includes(comment))
    return comment === NAV_OF_DEPARTMENT[department]

  return true
}

/** «Manager · Trim» when scoped to one department, otherwise just the role. */
export const viewingAsLabel = (role: Role, department: Department) =>
  isScoped(role) && department !== 'all'
    ? `${ROLE_LABELS[role]} · ${DEPARTMENT_LABELS[department]}`
    : ROLE_LABELS[role]
