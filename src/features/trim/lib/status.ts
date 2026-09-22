/**
 * What a status reads as on the board, and the colour it reads in.
 *
 * One value set spans every department; which of them an order or a line item can actually reach in
 * Trim is the server's business. Anything unrecognised still has to render, so it falls back to its
 * own name in the neutral tint rather than disappearing.
 */
const ORDER_STATUS: Record<string, { label: string; tint: string }> = {
  not_started: { label: 'Not Started', tint: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', tint: 'bg-primary/10 text-primary' },
  wrapped: { label: 'Wrapped', tint: 'bg-success/10 text-success' },
  bypassed: { label: 'Bypassed', tint: 'bg-warning/15 text-warning' },
  completed: { label: 'Completed', tint: 'bg-success/10 text-success' }
}

const ITEM_STATUS: Record<string, { label: string; tint: string }> = {
  not_started: { label: 'Not Started', tint: 'bg-muted text-muted-foreground' },
  cut: { label: 'Cut', tint: 'bg-primary/10 text-primary' },
  bent: { label: 'Bent', tint: 'bg-destructive/10 text-destructive' },
  in_progress: { label: 'In Progress', tint: 'bg-primary/10 text-primary' },
  wrapped: { label: 'Wrapped', tint: 'bg-success/10 text-success' },
  stock: { label: 'Stock', tint: 'bg-warning/15 text-warning' },
  bypassed: { label: 'Bypassed', tint: 'bg-warning/15 text-warning' }
}

const humanise = (status: string) =>
  status.replace(/_/g, ' ').replace(/^./, first => first.toUpperCase())

const read = (table: Record<string, { label: string; tint: string }>, status: string | null) => {
  if (!status) return null
  return table[status] ?? { label: humanise(status), tint: 'bg-muted text-muted-foreground' }
}

export const orderStatus = (status: string | null) => read(ORDER_STATUS, status)
export const itemStatus = (status: string | null) => read(ITEM_STATUS, status)
