import { machineTotals, slinetTotals } from './selectors'
import { addReman, trimStore } from './store'

/**
 * #28: a remanufacture is work, and the day's strip has to keep counting it.
 *
 * The canvas draws the two requests differently — one raised at a machine «gets removed from the
 * current bendlist and a new bendlist is created with only that line item in it», one raised in
 * Wrapping leaves the line alone and asks for the damaged pieces again — and the totals have to
 * follow both without the pieces falling down the gap between a cutlist and a reman list.
 */
const firstMember = () => {
  const state = trimStore.get()
  const cutlist = state.cutlists.find(candidate => candidate.members.length > 0)
  if (!cutlist) throw new Error('seed has no cutlist')
  const member = cutlist.members[0]!
  const order = state.orders.find(candidate => candidate.id === member.orderId)!
  const item = order.lineItems.find(candidate => candidate.id === member.lineId)!
  return { date: cutlist.date, order, item }
}

const snapshot = () =>
  JSON.parse(JSON.stringify(trimStore.get())) as ReturnType<typeof trimStore.get>

let saved: ReturnType<typeof snapshot>

beforeEach(() => {
  saved ??= snapshot()
  trimStore.set(saved)
})

it('keeps a machine-raised remanufacture in its machine’s day totals', () => {
  const { date, order, item } = firstMember()
  const machineId = item.machineId
  const before = machineTotals(machineId, date)

  addReman('machine', order.id, item.id, 2)

  // the line left the bendlist for a reman list of its own — on the same machine, the same day
  const after = machineTotals(machineId, date)
  expect(after.pieces).toBe(before.pieces)
  expect(after.bends).toBe(before.bends)
})

it('adds the recut to the Slinet’s day, because the Slinet has to cut it again', () => {
  const { date, order, item } = firstMember()
  const before = slinetTotals(date)

  addReman('wrapping', order.id, item.id, 3)

  expect(slinetTotals(date).pieces).toBe(before.pieces + 3)
})

it('adds a Wrapping-raised remanufacture to the machine that has to bend it', () => {
  const { date, order, item } = firstMember()
  const before = machineTotals(item.machineId, date)

  addReman('wrapping', order.id, item.id, 3)

  // the line stays in its bendlist — this is three more pieces on top of it
  expect(machineTotals(item.machineId, date).pieces).toBe(before.pieces + 3)
})
