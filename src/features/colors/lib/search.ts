import * as z from 'zod/mini'
import { searchTerm } from '@/lib/search-term'

// A stray `?search=` or `?show=` should show every colour, not a 4xx.
export const colorsSearchSchema = z.object({
  search: searchTerm,
  show: z.catch(z.optional(z.enum(['all', 'unlinked'])), undefined)
})

export type ColorsShow = 'all' | 'unlinked'
