import type { Cutlist, LineItem, Order, Reman } from './types'

/**
 * The rules of a remanufacture, away from the store that holds them and the screens that draw them.
 *
 * #28 is the review thread this file answers, and Kevin's last word on it is the reason it exists at
 * all: «The Remanufacturing function should always be available, even on a Remanufacturing order, it
 * should be able to be an endless loop of Remanufacturing.» An endless chain makes three questions
 * ambiguous that a single request never raised — how many pieces a list owes, how many a keypad may
 * still take, and how much work a day is really holding — and the answers have to be the same
 * everywhere they are asked. So they are here, once, and the store, the selectors and the cells all
 * read them from here.
 *
 * Two of #28's questions were answered by *not* building anything, and are recorded here so the gap is
 * a decision rather than an oversight:
 *
 * - Cancelling a request — a qty typed by mistake, or on the wrong line — «I'm not sure how we should
 *   cancel a Remanufacture, maybe we can add that in after.» So a request is still one-way, and the
 *   only guard against a mistake is `remanRoom` refusing more than the line has.
 * - The Slinet raising one of its own: «The Slinet does not need to request remanufacturing.» Its
 *   column stays Recut — what it owes on someone else's request — and every request keeps coming from
 *   a machine or from Wrapping, which is what `Reman['source']` is allowed to be.
 */

/**
 * Whether a reman list carries the line it came from, or only the pieces asked for again.
 *
 * N-061/066/069: a machine-raised request pulls the whole line out of its bendlist, so the machine
 * still owes every piece of it; one raised from Wrapping asks only for the damaged ones, the rest of
 * the order having already been made. A parented request pulls nothing — the line left its bendlist at
 * the first request, and the list this one was raised against holds its own qty and no more.
 */
export const remanCarriesWholeLine = (reman: Reman) => reman.source === 'machine' && !reman.parentId

/** What a reman list reads as its Qty Ordered, and so the cap on a remanufacture raised against it. */
export const remanOrdered = (reman: Reman, item?: LineItem | null) =>
  remanCarriesWholeLine(reman) && item ? item.qty : reman.qty

/**
 * What the Remanufacture column of a line owes, and what it has remade in total.
 *
 * A chain does not multiply the pieces. A pass raised against a request that is still open is those
 * same pieces coming back inside it, so the pieces owed are the *topmost* open request of each
 * branch — never a pass and its parent both. A pass raised against a request already Bent is a fresh
 * spoil of material that had come back good, so that one is owed on its own.
 *
 * `remade` is the other question, and the opposite sum: every request ever raised on the line, because
 * the Slinet really did cut each of them. `shown` is what the cell prints — owed while anything is
 * owed, and once nothing is, the lifetime count that the green cell stands for.
 */
export type RemanSummary = { owed: number; remade: number; shown: number }

export const lineRemanSummary = (lineRemans: Reman[]): RemanSummary => {
  const byId = new Map(lineRemans.map(reman => [reman.id, reman]))

  const insideAnOpenRequest = (reman: Reman) => {
    let ancestor = reman.parentId ? byId.get(reman.parentId) : undefined
    while (ancestor) {
      if (!ancestor.bent) return true
      ancestor = ancestor.parentId ? byId.get(ancestor.parentId) : undefined
    }
    return false
  }

  const owed = lineRemans
    .filter(reman => !reman.bent && !insideAnOpenRequest(reman))
    .reduce((sum, reman) => sum + reman.qty, 0)
  const remade = lineRemans.reduce((sum, reman) => sum + reman.qty, 0)

  return { owed, remade, shown: owed || remade }
}

/**
 * (883, 656) / (848, 677): the row of a line under remanufacture, orange while a request is open and
 * green once the machine has the pieces back. Empty for a line no request was ever raised on. Overdue
 * outranks it, and does so in the stylesheet — see the rule beside these classes in `home.css`.
 */
export const remanRowClass = ({ owed, remade }: RemanSummary) =>
  owed ? 'row-reman' : remade ? 'row-reman-done' : ''

export const lineRemansOf = (remans: Reman[], orderId: number, lineId: number) =>
  remans.filter(reman => reman.orderId === orderId && reman.lineId === lineId)

/** What one line owes and has remade — the walk every screen would otherwise write out itself. */
export const lineRemanSummaryOf = (remans: Reman[], orderId: number, lineId: number) =>
  lineRemanSummary(lineRemansOf(remans, orderId, lineId))

/** Whether anything on the order is still waiting to come back from a machine. */
export const orderOwesReman = (remans: Reman[], order: Order) =>
  order.lineItems.some(item => lineRemanSummaryOf(remans, order.id, item.id).owed > 0)

/**
 * The most a keypad may take, and the same number `addReman` refuses to exceed.
 *
 * Against a reman list it is that list's Qty Ordered — the most there is on it to spoil. Against the
 * order's own line the canvas sets it verbatim: «Should only be able to enter a number between 1 and
 * the Qty Ordered» — less whatever the line already owes, because two open requests that together
 * exceed the line would have it owing pieces it never had.
 */
export const remanRoom = (remans: Reman[], order: Order, item: LineItem, parent?: Reman | null) => {
  if (parent) return remanOrdered(parent, item)

  const { owed } = lineRemanSummary(lineRemansOf(remans, order.id, item.id))
  return Math.max(0, item.qty - owed)
}

/**
 * Whether a line has been pulled out of its bendlist by a machine-raised remanufacture.
 *
 * It is asked of the bendlist views and of the machine's day totals, and never of the Slinet's: the
 * canvas takes the line out of «the current bendlist», and the cutlist that already cut it keeps it.
 */
export const isPulledFromBendlist = (cutlist: Cutlist, orderId: number, lineId: number) =>
  !!cutlist.pulledMembers?.some(member => member.orderId === orderId && member.lineId === lineId)
