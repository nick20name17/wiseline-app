import * as z from 'zod/mini'

// A stray `?search=` should show every priority, not a 4xx.
export const prioritiesSearchSchema = z.object({
  search: z.catch(z.optional(z.string()), undefined)
})

export type PrioritiesSearch = z.infer<typeof prioritiesSearchSchema>
