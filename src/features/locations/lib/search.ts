import * as z from 'zod/mini'
import { searchTerm } from '@/lib/search-term'

// A stray `?search=` or `?department=` should show everything, not a 4xx.
export const locationsSearchSchema = z.object({
  search: searchTerm,
  // The department's code, which reads better in a link than its id.
  department: z.catch(z.optional(z.string()), undefined)
})
