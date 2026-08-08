import * as z from 'zod'

import { persisted } from '@/store/persisted'
import { viewerStore } from '@/session/viewer'

import type { Persisted } from '@/store/persisted'

/**
 * The order a person has dragged a table's columns into (N-166).
 *
 * Kept per viewing-as role and per table, because the point of the feature is that a Worker at a
 * machine and a Manager at a desk want different columns first in the same grid. Service columns — the
 * checkbox and the expander — are pinned and never appear here; only data columns reorder.
 *
 * Survives a reload on purpose: the prototype clears every `wl_` key on F5 except this one, the viewing
 * identity, and the Settings values.
 */
const OrderSchema = z.array(z.string())

const stores = new Map<string, Persisted<string[] | null>>()

export const columnOrder = (table: string): Persisted<string[] | null> => {
  const role = viewerStore.get()?.role ?? 'manager'
  const key = `wl_colorder_${role}_${table}`

  const existing = stores.get(key)
  if (existing) return existing

  const store = persisted<string[] | null, string[]>({
    key,
    schema: OrderSchema,
    fallback: () => null,
    decode: stored => stored,
    encode: order => order ?? []
  })
  stores.set(key, store)
  return store
}
