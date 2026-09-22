/**
 * What a status reads as on the board, and the colour it reads in.
 *
 * The board tints by what the status means rather than by how far along it is: grey for standing
 * still, blue for the floor working on it, amber while the order is moving, green once it is wrapped,
 * and orange for a trim that took a route it normally would not.
 *
 * One value set spans every department; which of them an order or a line item can actually reach in
 * Trim is the server's business. Anything unrecognised still has to render, so it falls back to its
 * own name in the neutral tint rather than disappearing.
 */
const GREY = 'bg-muted text-muted-foreground'
const BLUE = 'bg-primary/10 text-primary'
const AMBER = 'bg-warning/15 text-warning'
const GREEN = 'bg-success/10 text-success'
const ORANGE = 'bg-caution/15 text-caution'

const ORDER_STATUS: Record<string, { label: string; tint: string }> = {
  not_started: { label: 'Not Started', tint: GREY },
  in_progress: { label: 'In Progress', tint: AMBER },
  wrapped: { label: 'Wrapped', tint: GREEN },
  bypassed: { label: 'Bypassed', tint: ORANGE },
  completed: { label: 'Completed', tint: GREEN }
}

const ITEM_STATUS: Record<string, { label: string; tint: string }> = {
  not_started: { label: 'Not Started', tint: GREY },
  // Cut and bent are both the floor working the trim, so the board gives them one colour.
  cut: { label: 'Cut', tint: BLUE },
  bent: { label: 'Bent', tint: BLUE },
  in_progress: { label: 'In Progress', tint: AMBER },
  wrapped: { label: 'Wrapped', tint: GREEN },
  // Coming off the shelf is not progress through the shop, so it sits with the neutral ones.
  stock: { label: 'Stock', tint: GREY },
  bypassed: { label: 'Bypassed', tint: ORANGE }
}

const humanise = (status: string) =>
  status.replace(/_/g, ' ').replace(/^./, first => first.toUpperCase())

const read = (table: Record<string, { label: string; tint: string }>, status: string | null) => {
  if (!status) return null
  return table[status] ?? { label: humanise(status), tint: GREY }
}

export const orderStatus = (status: string | null) => read(ORDER_STATUS, status)
export const itemStatus = (status: string | null) => read(ITEM_STATUS, status)
