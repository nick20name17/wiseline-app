import * as z from 'zod/mini'
import { searchTerm } from '@/lib/search-term'
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
  search: searchTerm,
  // Where the Production tab stands, so a reload or a shared link opens on the same list. Left out
  // while it is the Slinet's active lists, the tab's default.
  // A machine's id is a number, so it reads `station=58` rather than `station=%2258%22`.
  station: z.catch(z.optional(z.union([z.number(), z.string()])), undefined),
  done: z.catch(z.optional(z.boolean()), undefined)
})

export type BoardSearch = z.infer<typeof boardSearchSchema>

/** A Production station as the URL keeps it: a machine by its numeric id, a named one by name. */
export const stationParam = (station: string | undefined) =>
  station !== undefined && /^\d+$/.test(station) ? Number(station) : station

/**
 * The search a tab opens with. The order tabs share one term; Coils searches coils, so a term does not
 * cross between them, where an order number would empty the coil list.
 */
export const withView = (previous: BoardSearch, view: BoardSearch['view']): BoardSearch => ({
  ...previous,
  view,
  search: (previous.view === 'coils') === (view === 'coils') ? previous.search : undefined
})

/** Whether any of a row's fields holds the header search; no search keeps every row. */
export const matchesSearch = (
  search: string | undefined,
  ...fields: (string | null | undefined)[]
) => {
  const term = search?.trim().toLowerCase()
  return !term || fields.some(field => field?.toLowerCase().includes(term))
}
