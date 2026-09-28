import * as z from 'zod/mini'

// A stray `?search=` or `?show=` should show every colour, not a 4xx.
export const colorsSearchSchema = z.object({
  search: z.catch(z.optional(z.string()), undefined),
  show: z.catch(z.optional(z.enum(['all', 'unlinked'])), undefined)
})

export type ColorsShow = 'all' | 'unlinked'
