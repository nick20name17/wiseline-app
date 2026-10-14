import * as z from 'zod/mini'

// A stray `?year=` or `?view=` should show this year's calendar, not a 4xx.
export const workDaysSearchSchema = z.object({
  year: z.catch(z.optional(z.int()), undefined),
  view: z.catch(z.optional(z.enum(['calendar', 'list'])), undefined)
})

export type WorkDaysView = NonNullable<z.infer<typeof workDaysSearchSchema>['view']>
