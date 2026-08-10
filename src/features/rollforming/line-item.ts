import { rollformingStore } from './store'

import type { CoilUnit, LineItem, Note } from './types'

const PROFILE_CODE: Record<string, string> = {
  'Tuff Rib': 'TR',
  'DRIPSTOP Tuff Rib': 'TRS',
  'Diamond Rib': 'DR',
  'REVERSED Diamond Rib': 'DRS',
  'Agra Panel': 'AG',
  'Titan Panel': 'TP',
  'S.S. 1-1/2" Snaplock': 'SS1',
  'S.S. 2" Mechanical': 'SS2',
  'Board & Batten': 'BB',
  'Corrugated 7/8"': 'CG',
  'Bin Feed Cut-to-Length': 'BF'
}

/** EBMS builds the Product ID out of the coil it will be rolled from, not out of a catalogue. */
export const deriveProductId = (profile: string, gauge: number, width: number, color: string) => {
  const code = PROFILE_CODE[profile] ?? profile.slice(0, 2).toUpperCase()
  const initial = color.trim().charAt(0).toUpperCase() || 'X'
  return `${code}${gauge}${Math.round(width)}${initial}`
}

/**
 * Line ids continue past the seed's. Read on first use rather than at import: the store imports this
 * module, so at load time its own binding is not initialised yet.
 */
let lineSeq: number | null = null

type Draft = {
  profile: string
  gauge: number
  thickness: number
  width: number
  color: string
  qty: number
  length?: number | null
  linearFeet?: number | null
  fromStock?: number
  scheduledDate?: string | null
  coilPreset?: { supplierId?: number | null; coilNumber?: string; needsSlit?: boolean }[]
  notes?: Note[]
}

/**
 * One line item, exploded into a coil unit per ordered piece — the prototype's `li()`.
 *
 * The canvas is explicit that a line of Qty 6 is six rows of one, because each piece is rolled off its
 * own coil and gets assigned separately. Units taken from stock sit at the tail and carry `stock`:
 * they are not being made, so they never reach the Queue, the capacity maths or a slit decision.
 */
export const buildLineItem = (draft: Draft): LineItem => {
  const fromStock = Math.max(0, Math.min(draft.qty, draft.fromStock ?? 0))
  const firstStockIdx = draft.qty - fromStock

  lineSeq ??= Math.max(
    100,
    ...rollformingStore.get().orders.flatMap(order => order.lineItems.map(item => item.id))
  )
  lineSeq += 1

  return {
    id: lineSeq,
    profile: draft.profile,
    gauge: draft.gauge,
    thickness: draft.thickness,
    width: draft.width,
    color: draft.color,
    productId: deriveProductId(draft.profile, draft.gauge, draft.width, draft.color),
    qty: draft.qty,
    length: draft.length ?? null,
    linearFeet: draft.linearFeet ?? null,
    fromStock,
    scheduledDate: draft.scheduledDate ?? null,
    coils: Array.from({ length: draft.qty }, (_, index): CoilUnit => {
      const preset = draft.coilPreset?.[index] ?? {}
      const stock = index >= firstStockIdx
      return {
        supplierId: preset.supplierId ?? null,
        coilNumber: preset.coilNumber ?? '',
        needsSlit: stock ? false : !!preset.needsSlit,
        slitDone: false,
        workerAssigned: false,
        stock
      }
    }),
    notes: draft.notes ?? []
  }
}
