import * as z from 'zod/mini'
import { persistedStore, type PersistedStore } from './persisted-store'

/**
 * A saved order outlives the table it was saved from: a release can rename, drop or add a column.
 * Saved keys keep their places and anything the table no longer declares is ignored. A column the
 * table has since gained goes right after the column it follows in the declaration (or first, when
 * it is declared first), so it shows up where it belongs rather than at the far end of the grid for
 * everyone who ever dragged a column.
 */
export const withNewColumns = (saved: readonly string[], declared: readonly string[]) => {
  const known = new Set(declared)
  const next = saved.filter(key => known.has(key))
  const placed = new Set(next)

  declared.forEach((key, index) => {
    if (placed.has(key)) return
    const previous = index > 0 ? declared[index - 1] : undefined
    next.splice(previous ? next.indexOf(previous) + 1 : 0, 0, key)
    placed.add(key)
  })

  return next
}

const orderSchema = z.array(z.string())

const stores = new Map<string, PersistedStore<string[]>>()

/**
 * The order one person has dragged a table's columns into, kept in this browser. A table's header and
 * its rows are often separate components; both read the same store, so they cannot disagree.
 */
export const columnOrderStore = (table: string) => {
  let store = stores.get(table)
  if (!store) {
    store = persistedStore(`column-order:${table}`, orderSchema)
    stores.set(table, store)
  }
  return store
}
