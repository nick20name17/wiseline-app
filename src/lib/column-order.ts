import * as z from 'zod/mini'
import type { PersistedStore } from './persisted-store'
import { preferenceStore } from './preferences'

/**
 * A saved order outlives the table it was saved from: a release can rename, drop or add a column.
 * Saved keys keep their places and anything the table no longer declares is ignored. A column the
 * table has since gained goes right after the column it follows in the declaration (or first, when
 * it is declared first), so it shows up where it belongs rather than at the far end of the grid for
 * everyone who ever dragged a column.
 */
export const withNewColumns = (saved: readonly string[], declared: readonly string[]) => {
  const known = new Set(declared)
  // A key saved twice would draw its column twice.
  const next = [...new Set(saved)].filter(key => known.has(key))
  const placed = new Set(next)

  declared.forEach((key, index) => {
    if (placed.has(key)) return
    const previous = index > 0 ? declared[index - 1] : undefined
    next.splice(previous ? next.indexOf(previous) + 1 : 0, 0, key)
    placed.add(key)
  })

  return next
}

// One preference per table, both halves in it: the order its columns were dragged into, and the px
// widths their edges were dragged to (a column not in it keeps its declared width).
const tableSchema = z.object({
  order: z.optional(z.array(z.string())),
  widths: z.optional(z.record(z.string(), z.number()))
})

type TableLayout = z.infer<typeof tableSchema>

const tableStores = new Map<string, PersistedStore<TableLayout>>()

const tableStore = (table: string) => {
  let store = tableStores.get(table)
  if (!store) {
    store = preferenceStore(`table:${table}`, tableSchema)
    tableStores.set(table, store)
  }
  return store
}

/** One half of a table's layout, written without touching the other. */
const half = <K extends keyof TableLayout>(
  table: string,
  part: K
): PersistedStore<NonNullable<TableLayout[K]>> => {
  const store = tableStore(table)
  return {
    get: () => store.get()?.[part] ?? null,
    set: next => {
      const { [part]: _, ...rest } = store.get() ?? {}
      const layout: TableLayout = next === null ? rest : { ...rest, [part]: next }
      store.set(Object.keys(layout).length ? layout : null)
    },
    subscribe: store.subscribe
  }
}

/**
 * The order one person has dragged a table's columns into, kept for them on the server. A table's
 * header and its rows are often separate components; both read the same store, so they cannot
 * disagree.
 */
export const columnOrderStore = (table: string) => half(table, 'order')

/** The widths one person has dragged a table's columns to, kept like the order. */
export const columnWidthStore = (table: string) => half(table, 'widths')
