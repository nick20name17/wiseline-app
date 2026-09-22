/**
 * The board shows one name; the API keeps two. The first word is the given name and whatever
 * follows is the family name, which is how the rows were typed in to begin with.
 */
export const splitName = (name: string) => {
  const [first = '', ...rest] = name.trim().split(/\s+/)
  return { first_name: first, last_name: rest.join(' ') }
}

export const fullName = (user: { first_name: string; last_name: string }) =>
  `${user.first_name} ${user.last_name}`.trim()
