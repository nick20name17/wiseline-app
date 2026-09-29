import * as z from 'zod/mini'
import { BOARD_VIEWS } from './boards'

/**
 * The tabs are one search param rather than routes: they share a selection, a search term and a scroll
 * position, and moving between them is changing a tab rather than leaving the page.
 *
 * Everything is `catch`-wrapped so a hand-typed URL lands on the default tab instead of a 4xx; a tab
 * the department or the role does not have is moved off by the page.
 */
export const boardSearchSchema = z.object({
  view: z.catch(z.enum(BOARD_VIEWS), 'unscheduled'),
  search: z.catch(z.optional(z.string()), undefined)
})

export type BoardSearch = z.infer<typeof boardSearchSchema>
