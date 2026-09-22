import * as z from 'zod/mini'

// A stray `?search=` should show everything, not a 4xx.
export const locationsSearchSchema = z.object({
  search: z.catch(z.optional(z.string()), undefined)
})

export type LocationsSearch = z.infer<typeof locationsSearchSchema>
