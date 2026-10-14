import type { departmentRole } from '@/lib/departments'

export type ShippingRole = ReturnType<typeof departmentRole>

/**
 * Shipping's own windows, by the user's role in the Shipping department. The Manager works all of them
 * p3 (570,171); the Worker loads the trucks; the Driver drives them; View only reads the schedule.
 */
export const shippingPages = (globalRole: string, role: ShippingRole) => ({
  shipping: role === 'manager' || role === 'viewer',
  loading: role === 'manager' || role === 'worker',
  driver: role === 'manager' || globalRole === 'driver'
})

/** Where someone turned away from one of Shipping's windows goes instead — never back to it. */
export const shippingFallback = (globalRole: string, role: ShippingRole) => {
  const pages = shippingPages(globalRole, role)
  if (pages.loading) return '/loading'
  if (pages.driver) return '/driver'
  if (pages.shipping) return '/shipping'
  return '/trim'
}
