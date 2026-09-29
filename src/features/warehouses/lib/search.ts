import * as z from 'zod/mini'
import { searchTerm } from '@/lib/search-term'

// A stray `?search=` should show every warehouse, not a 4xx.
export const warehousesSearchSchema = z.object({
  search: searchTerm
})
