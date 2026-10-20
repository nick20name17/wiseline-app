/**
 * What a status reads as, on the boards and in Shipping, and the colour it reads in.
 *
 * Tinted by what the status means rather than by how far along it is: grey for standing still, blue
 * for made and waiting on the next hand, amber while work or the truck is moving or a trim waits on
 * the shelf, green once it is done, purple for an order that bypassed production, and red for a line
 * Shipping is still waiting on.
 *
 * One value set spans every department; which of them an order or a line item can actually reach in
 * a department is the server's business. Anything unrecognised still has to render, so it falls back to its
 * own name in the neutral tint rather than disappearing.
 */
const GREY = 'bg-muted text-muted-foreground'
const BLUE = 'bg-primary/10 text-primary'
const AMBER = 'bg-warning/15 text-warning'
const GREEN = 'bg-success/10 text-success'
const PURPLE = 'bg-bypass/15 text-bypass'
const RED = 'bg-destructive/10 text-destructive'

// Shipping's steps, which an order on a truck shares with its Load.
const SHIPPING = {
  loading: { label: 'Loading', tint: AMBER },
  // On the dock, waiting on the Driver: made and waiting like Rolled.
  loaded: { label: 'Loaded', tint: BLUE },
  en_route: { label: 'En Route', tint: AMBER },
  delivered: { label: 'Delivered', tint: GREEN },
  completed: { label: 'Completed', tint: GREEN }
}

const ORDER_STATUS: Record<string, { label: string; tint: string }> = {
  not_started: { label: 'Not Started', tint: GREY },
  in_progress: { label: 'In Progress', tint: AMBER },
  // Rollforming's Done: all packed at the machine, its packages waiting for locations p2 (1145,294).
  rolled: { label: 'Rolled', tint: BLUE },
  wrapped: { label: 'Wrapped', tint: GREEN },
  // Accessories finish at Packaged where Trim finishes at Wrapped p3 (1077,291).
  packaged: { label: 'Packaged', tint: GREEN },
  bypassed: { label: 'Bypassed', tint: PURPLE },
  ...SHIPPING
}

const ITEM_STATUS: Record<string, { label: string; tint: string }> = {
  not_started: { label: 'Not Started', tint: GREY },
  // Cut and bent are both the floor working the trim, so the board gives them one colour.
  cut: { label: 'Cut', tint: BLUE },
  bent: { label: 'Bent', tint: BLUE },
  // Rollforming's made line p2 (1009,464), the floor's colour like Trim's Bent.
  rolled: { label: 'Rolled', tint: BLUE },
  in_progress: { label: 'In Progress', tint: AMBER },
  wrapped: { label: 'Wrapped', tint: GREEN },
  packaged: { label: 'Packaged', tint: GREEN },
  stock: { label: 'Stock', tint: AMBER },
  bypassed: { label: 'Bypassed', tint: PURPLE },
  shipped: { label: 'Shipped', tint: GREEN }
}

// A Load's packages and skids carry its status too; an unreleased Load is one not yet started.
const LOAD_STATUS: Record<string, { label: string; tint: string }> = {
  unreleased: { label: 'Unreleased', tint: GREY },
  not_started: { label: 'Not Started', tint: GREY },
  ...SHIPPING
}

const humanise = (status: string) =>
  status.replace(/_/g, ' ').replace(/^./, first => first.toUpperCase())

const read = (table: Record<string, { label: string; tint: string }>, status: string | null) => {
  if (!status) return null
  return table[status] ?? { label: humanise(status), tint: GREY }
}

export const orderStatus = (status: string | null) => read(ORDER_STATUS, status)
export const itemStatus = (status: string | null) => read(ITEM_STATUS, status)
export const loadStatus = (status: string | null) => read(LOAD_STATUS, status)

const READY = { label: 'Ready', tint: GREEN }
const NOT_READY = { label: 'Not Ready', tint: RED }

/** Whether a line of an order can go on the truck yet. */
export const lineReadiness = (ready: boolean) => (ready ? READY : NOT_READY)
