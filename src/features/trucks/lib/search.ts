import * as z from 'zod/mini'
import { searchTerm } from '@/lib/search-term'

// A stray `?search=` should show every truck, not a 4xx.
export const trucksSearchSchema = z.object({
  search: searchTerm
})
