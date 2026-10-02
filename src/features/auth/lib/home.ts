import type { Me } from '../api'

const BOARDS = { Trim: '/trim', Rollforming: '/rollforming', Accessories: '/accessories' } as const

/**
 * Where a user lands: their own board. A driver drives; a worker or manager opens the first line
 * they are on, or Shipping if that is all they do; anyone who reaches every department starts on
 * Trim, the first of them.
 */
export const homePath = (user: Me) => {
  if (user.role === 'driver' || user.process_types.includes('driver')) return '/driver'
  const line = user.prod_types.find((type): type is keyof typeof BOARDS => type in BOARDS)
  if (line) return BOARDS[line]
  if (user.process_types.includes('shipping') && !user.process_types.includes('production')) {
    return '/shipping'
  }
  return '/trim'
}
