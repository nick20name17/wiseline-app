import type { DayStripEntry } from '../api'
import type { Board } from './boards'
/**
 * `Tue, July 14, 2026 · 2:41 PM` — an instant rather than a production day (`@/lib/days`), so it is
 * read in local time: it records when somebody on the floor pressed a button.
 */
export const formatStamp = (iso: string) => {
  const at = new Date(iso)
  const day = at.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  return `${day} · ${at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export const formatCount = (value: number) => numbers.format(value)

/** A product's colour and gauge the way the cards and their labels print them. */
export const productFacts = (product: { color: string | null; gauge: string | null }) =>
  [product.color, product.gauge === null ? null : `${product.gauge} ga`].filter(Boolean).join(' · ')

/**
 * A day's load as its pill prints it: Trim's bends against its machines' daily capacity; a board
 * whose machines are not assigned here, the pieces on the day p3 (1078,280).
 */
export const dayLoad = (entry: DayStripEntry, board: Board) =>
  board.assignsMachines ? `${entry.bends} / ${entry.capacity ?? '—'}` : `${entry.pieces} pcs`
