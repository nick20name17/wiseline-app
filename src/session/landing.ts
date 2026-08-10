import { isScoped, type Department, type Role } from '@/session/viewer'

/**
 * Where a viewer belongs the moment their role is known.
 *
 * The sign-in screen and the «Viewing as» menu both had their own copy of this table, and the copies
 * had already drifted: the menu sends a Worker to Trim's Production view, signing in as one left them
 * on the board. One table, so the two ways into the app cannot disagree.
 */
export const DEPARTMENT_PAGE: Record<Exclude<Department, 'all'>, string> = {
  trim: '/trim',
  rollforming: '/rollforming',
  accessories: '/accessories',
  shipping: '/shipping'
}

const LANDING: Record<Role, string> = {
  admin: '/dashboard',
  manager: '/dashboard',
  worker: '/trim',
  shipping: '/shipping',
  driver: '/driver'
}

/** A Worker lands on the floor rather than on the board, which for Trim means Production. */
const LANDING_SEARCH: Partial<Record<Role, Record<string, string>>> = {
  worker: { view: 'production' }
}

export const landingFor = (role: Role, department: Department) =>
  isScoped(role) && department !== 'all' ? DEPARTMENT_PAGE[department] : LANDING[role]

export const landingSearchFor = (role: Role, department: Department) =>
  isScoped(role) && department !== 'all' ? undefined : LANDING_SEARCH[role]
