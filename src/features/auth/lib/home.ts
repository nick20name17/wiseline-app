type HomeUser = { role: string; prod_types: string[]; process_types: string[] }

// The production lines in sidebar order, so a user on several lands on the first one shown.
const LINE_PATHS = [
  ['Trim', '/trim'],
  ['Rollforming', '/rollforming'],
  ['Accessories', '/accessories']
] as const

/**
 * The page a user starts on: their own work. Roles that run every department and users assigned
 * nowhere land on Trim — the first board, whose gate tells the unassigned whom to ask.
 */
export const homePath = ({ role, prod_types, process_types }: HomeUser) => {
  if (role === 'driver') return '/driver'
  if (role === 'admin' || role === 'super_manager') return '/trim'
  const line = LINE_PATHS.find(([name]) => prod_types.includes(name))
  if (line) return line[1]
  return process_types.includes('shipping') ? '/shipping' : '/trim'
}
