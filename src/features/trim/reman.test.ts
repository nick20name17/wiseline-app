import { lineRemanSummary, lineRemansOf, remanOrdered } from './reman'
import {
  computeBatches,
  machineTotals,
  remanBendlistEntries,
  remanCutlistEntries,
  slinetTotals,
  wrapAllowedOf,
  wrapOrderComplete
} from './selectors'
import { addReman, bypassProduction, setRemanFlag, trimStore } from './store'

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

/**
 * #28, Kevin's addition to the canvas: «we need to be able to do a Remanufacture on a Remanufacture as
 * well … it should be able to be an endless loop of Remanufacturing.»
 */
const lastReman = () =>
  trimStore.get().remans.at(-1) as NonNullable<ReturnType<typeof trimStore.get>['remans'][number]>

const owedOn = (orderId: number, lineId: number) =>
  lineRemanSummary(lineRemansOf(trimStore.get().remans, orderId, lineId))

it('never runs out of passes — the deepest remake can always be remade again', () => {
  const { order, item } = firstMember()
  addReman('machine', order.id, item.id, 4)
  let deepest = lastReman()

  for (let round = 0; round < 5; round += 1) {
    addReman('machine', order.id, item.id, 1, deepest.id)
    deepest = lastReman()

    // a pass nobody can see on either station is a pass with nowhere to go next
    expect(remanCutlistEntries(false).some(entry => entry.id === deepest.id)).toBe(true)
    expect(remanBendlistEntries(item.machineId, false).some(entry => entry.id === deepest.id)).toBe(
      true
    )
  }
})

it('caps a request against a reman list at that list, not at the order', () => {
  const { order, item } = firstMember()

  addReman('wrapping', order.id, item.id, 2)
  const parent = lastReman()
  const before = trimStore.get().remans.length

  // the parent asked for 2 back; the line's own qty is no longer the ceiling
  addReman('machine', order.id, item.id, item.qty, parent.id)
  expect(trimStore.get().remans.length).toBe(before)

  addReman('machine', order.id, item.id, 2, parent.id)
  expect(trimStore.get().remans.length).toBe(before + 1)
})

it('leaves the cutlists alone on a parented request — the line already left', () => {
  const { order, item } = firstMember()

  addReman('machine', order.id, item.id, 2)
  const pulled = JSON.stringify(trimStore.get().cutlists)

  addReman('machine', order.id, item.id, 1, lastReman().id)
  expect(JSON.stringify(trimStore.get().cutlists)).toBe(pulled)
})

it('counts a chained remanufacture as its own pieces, never the whole line again', () => {
  const { date, order, item } = firstMember()

  addReman('machine', order.id, item.id, 2)
  const afterFirst = machineTotals(item.machineId, date)

  addReman('machine', order.id, item.id, 1, lastReman().id)

  // the whole-line rule belongs to the request that pulled the line; a chained one owes only its qty
  expect(machineTotals(item.machineId, date).pieces).toBe(afterFirst.pieces + 1)
})

it('a pass inside an open request is those same pieces coming back, not more owed', () => {
  const { order, item } = firstMember()

  addReman('wrapping', order.id, item.id, 4)
  addReman('machine', order.id, item.id, 2, lastReman().id)

  expect(owedOn(order.id, item.id).owed).toBe(4)
})

it('a pass raised after its request came back good is owed on its own', () => {
  const { order, item } = firstMember()

  addReman('wrapping', order.id, item.id, 4)
  const first = lastReman()
  setRemanFlag(first.id, 'bent', true)
  addReman('machine', order.id, item.id, 1, first.id)

  expect(owedOn(order.id, item.id).owed).toBe(1)
})

it('never lets a line owe more pieces than it has', () => {
  const { order, item } = firstMember()

  addReman('wrapping', order.id, item.id, item.qty)
  const before = trimStore.get().remans.length

  addReman('wrapping', order.id, item.id, 1)

  expect(trimStore.get().remans.length).toBe(before)
  expect(owedOn(order.id, item.id).owed).toBe(item.qty)
})

it('reads back every request once the line owes nothing', () => {
  const { order, item } = firstMember()

  addReman('wrapping', order.id, item.id, 3)
  const first = lastReman()
  addReman('machine', order.id, item.id, 1, first.id)
  const pass2 = lastReman()

  setRemanFlag(pass2.id, 'bent', true)
  setRemanFlag(first.id, 'bent', true)

  // the Slinet cut three, then one more: four pieces of material remade over the line's life
  expect(owedOn(order.id, item.id)).toEqual({ owed: 0, remade: 4, shown: 4 })
})

it('refuses a remanufacture on a bypassed order — it never went through production', () => {
  const { order, item } = firstMember()
  bypassProduction([order.id])
  const before = trimStore.get().remans.length

  addReman('wrapping', order.id, item.id, 1)

  expect(trimStore.get().remans.length).toBe(before)
})

it('shows a reman list its Qty Ordered as the qty to manufacture, not the reman qty', () => {
  const { order, item } = firstMember()

  addReman('machine', order.id, item.id, 2)
  const pulled = lastReman()
  // N-066/069: the line left its bendlist whole, so the machine still owes every piece of it
  expect(remanOrdered(pulled, item)).toBe(item.qty)

  addReman('wrapping', order.id, item.id, 2)
  // and a Wrapping request is only the pieces asked for again
  expect(remanOrdered(lastReman(), item)).toBe(2)
})

it('leaves the Slinet its cutlist when a machine pulls the line — it already cut it', () => {
  const state = trimStore.get()
  const cutlist = state.cutlists.find(candidate => candidate.members.length > 0)!
  const member = cutlist.members[0]!
  const order = state.orders.find(candidate => candidate.id === member.orderId)!
  const item = order.lineItems.find(candidate => candidate.id === member.lineId)!

  const slinetBefore = slinetTotals(cutlist.date).pieces
  const listsBefore = computeBatches(null, true).length

  addReman('machine', order.id, item.id, 2)

  // the Slinet keeps the pieces it cut and gains the recut on top; no cutlist disappears
  expect(slinetTotals(cutlist.date).pieces).toBe(slinetBefore + 2)
  expect(computeBatches(null, true).length).toBe(listsBefore)
  // the machine's bendlist is the one that loses it
  expect(
    computeBatches(item.machineId, false).some(batch => batch.items.some(row => row.id === item.id))
  ).toBe(false)
})

/**
 * #28, Kevin on whether Order Complete should wait: «in the wrapping window it should not allow you to
 * wrap the pieces that are not marked as done, only once the remanufactured request is marked as bent
 * should you be able to wrap them.»
 */
it('holds the pieces a request owes back from Wrapping until the machine marks it Bent', () => {
  const { order, item } = firstMember()

  addReman('wrapping', order.id, item.id, 2)
  expect(wrapAllowedOf(order, item)).toBe(item.qty - 2)

  setRemanFlag(lastReman().id, 'bent', true)
  expect(wrapAllowedOf(order, item)).toBe(item.qty)
})

it('holds nothing extra for a pass raised inside an open request', () => {
  const { order, item } = firstMember()

  addReman('wrapping', order.id, item.id, 3)
  addReman('machine', order.id, item.id, 1, lastReman().id)

  // the same three pieces coming back inside the request, so three held — not four
  expect(wrapAllowedOf(order, item)).toBe(item.qty - 3)
})

/**
 * #28, question 4 — «Should Order Complete wait for an open Remanufacture?» — «Yes». The case that
 * makes it a gate of its own: a Worker damages a piece he has *already wrapped*, so Left To Wrap is
 * zero and the older rule — that column reading zero — would let the batch go to EBMS short by it.
 */
it('holds Order Complete while a request is out, even with Left To Wrap at zero', () => {
  const { order, item } = firstMember()
  trimStore.set(state => ({
    orders: state.orders.map(candidate =>
      candidate.id === order.id
        ? {
            ...candidate,
            lineItems: candidate.lineItems.map(line => ({
              ...line,
              wrapped: line.qty,
              status: 'wrapped'
            }))
          }
        : candidate
    )
  }))
  const wrapped = trimStore.get().orders.find(candidate => candidate.id === order.id)!
  expect(wrapOrderComplete(wrapped)).toBe(true)

  addReman('wrapping', order.id, item.id, 1)
  expect(wrapOrderComplete(wrapped)).toBe(false)

  setRemanFlag(lastReman().id, 'bent', true)
  expect(wrapOrderComplete(wrapped)).toBe(true)
})
