import * as z from 'zod/mini'

// A stray `?search=` should show every user, not a 4xx.
export const usersSearchSchema = z.object({
  search: z.catch(z.optional(z.string()), undefined)
})
