import * as z from 'zod/mini'
import { TRIM_VIEWS } from './views'

/**
 * The six tabs are one search param rather than six routes: they share a selection, a search term and
 * a scroll position, and moving between them is changing a tab rather than leaving the page.
 *
 * Everything is `catch`-wrapped so a hand-typed URL lands on the default tab instead of a 4xx.
 */
export const trimSearchSchema = z.object({
  view: z.catch(z.enum(TRIM_VIEWS), 'unscheduled'),
  search: z.catch(z.optional(z.string()), undefined)
})

export type TrimSearch = z.infer<typeof trimSearchSchema>
