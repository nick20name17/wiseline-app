import type { RouteNames } from '@/types/routes'

export const AUTH_REDIRECTS = {
  loginSuccess: '/',
  driverLoginSuccess: '/driver',
  logout: '/login',
  unauthorized: '/',
  unauthorizedDriver: '/driver'
} satisfies Record<string, RouteNames>
