import * as z from 'zod/mini'

/**
 * A page's `?search=`. The router reads `?search=145715` as a number, and an order number is the
 * commonest thing searched for, so a number is taken as the term rather than thrown away.
 */
export const searchTerm = z.catch(
  z.optional(z.pipe(z.union([z.string(), z.number()]), z.transform(String))),
  undefined
)

/** A page whose only search param is the term. A stray `?search=` shows everything, not a 4xx. */
export const searchOnlySchema = z.object({ search: searchTerm })
