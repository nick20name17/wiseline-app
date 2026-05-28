import type { ProcessType, ProductCategory, UserRoles } from '@/api/users/schema'
import type { RouteNames } from '@/types/routes'

type User = {
  role: UserRoles
  process_types: ProcessType[]
  prod_types: ProductCategory[]
}

export const PUBLIC_PAGES: Set<RouteNames> = new Set([
  '/login',
  '/password/reset',
  '/password/reset/$token/$uid64'
])

// Map process_types → pages they unlock
const PROCESS_TYPE_PAGES: Record<ProcessType, RouteNames[]> = {
  driver: ['/driver', '/driver/$load', '/driver/notifications', '/driver/$load/scanner'],
  production: ['/'],
  dispatch: ['/dispatch'],
  shipping: ['/shipping'],
  loading: ['/scanner', '/loading']
}

const ROLE_OVERRIDES: Partial<Record<UserRoles, 'all' | RouteNames[]>> = {
  admin: 'all',
  client: ['/']
}

export const canAccessPage = (user: User | null, page: RouteNames): boolean => {
  if (PUBLIC_PAGES.has(page)) return true

  if (!user) return false

  const override = ROLE_OVERRIDES[user.role]

  if (override === 'all') return true
  if (override) return override.includes(page)

  return user?.process_types?.some((process) => PROCESS_TYPE_PAGES[process]?.includes(page))
}

export const getUserPages = (user: User) => {
  if (user.role === 'driver') return PROCESS_TYPE_PAGES.driver

  return user?.process_types?.flatMap((process) => PROCESS_TYPE_PAGES[process]) ?? []
}
