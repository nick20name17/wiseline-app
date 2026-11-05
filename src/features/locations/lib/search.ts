import * as z from 'zod/mini'
import { searchTerm } from '@/lib/search-term'
import { LOCATION_KINDS } from '../api'

// A stray `?search=` or `?department=` should show everything, not a 4xx.
export const locationsSearchSchema = z.object({
  search: searchTerm,
  // The department's code, which reads better in a link than its id.
  department: z.catch(z.optional(z.string()), undefined),
  // Order or Inventory, the tab inside the department; Order when none.
  kind: z.catch(z.optional(z.enum(LOCATION_KINDS)), undefined)
})
