import { parseDayParam } from './moon'
import * as z from 'zod/mini'

// Invalid or missing `?date=` falls back to "today" instead of a 4xx.
export const moonSearchSchema = z.object({
  date: z.catch(
    z.optional(z.string().check(z.refine(value => parseDayParam(value) !== undefined))),
    undefined
  )
})
