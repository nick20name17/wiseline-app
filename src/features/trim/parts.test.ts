import { isReleased, isReviewed, partDays } from './parts'
import { allMachinesAssigned } from './selectors'
import {
  releaseToProduction,
  scheduleLines,
  scheduleOrders,
  setLineMachine,
  setReviewed,
  toggleRelease,
  trimStore
} from './store'

/**
 * #6: «After splitting an order, each part needs to act as a completely separate order.»
 *
 * The scenario is Kevin's own: split one line onto another day, then work the two halves
 * independently. What is worth pinning is that the halves do not reach into each other — the gate,
 * the review, the release and the cutlist a line lands on all stop at the part boundary.
 */
const DAY_A = '2026-07-20'
const DAY_B = '2026-07-21'

const anOrder = () => {
  const order = trimStore.get().orders.find(candidate => candidate.lineItems.length >= 2)
  if (!order) throw new Error('seed has no order with two lines')
  return order
}

const reload = (id: number) => {
  const order = trimStore.get().orders.find(candidate => candidate.id === id)
  if (!order) throw new Error('order vanished')
  return order
}

const split = () => {
  const order = anOrder()
  const [first, ...rest] = order.lineItems
  scheduleOrders([order.id], DAY_A)
  scheduleLines(order.id, [first!.id], DAY_B)
  // every line needs a machine before Reviewed will arm
  for (const item of reload(order.id).lineItems) setLineMachine(order.id, item.id, 3)
  return { id: order.id, movedLine: first!.id, stayed: rest.map(item => item.id) }
}

beforeEach(() => {
  trimStore.set(state => ({
    orders: state.orders.map(order => ({ ...order, reviewedDays: [], releasedDays: [] })),
    releaseIds: []
  }))
})

it('reviews one part without touching the other', () => {
  const { id } = split()
  expect(partDays(reload(id))).toEqual([DAY_A, DAY_B])

  setReviewed(id, DAY_A, true)

  expect(isReviewed(reload(id), DAY_A)).toBe(true)
  expect(isReviewed(reload(id), DAY_B)).toBe(false)
  // and the order as a whole is only reviewed once both of its parts are
  expect(isReviewed(reload(id))).toBe(false)
})

it('gates a part on its own lines, not on the other part’s', () => {
  const { id, movedLine } = split()
  setLineMachine(id, movedLine, null)

  // the line without a machine is on day B, so only day B is held back
  expect(allMachinesAssigned(reload(id), DAY_A)).toBe(true)
  expect(allMachinesAssigned(reload(id), DAY_B)).toBe(false)
  expect(allMachinesAssigned(reload(id))).toBe(false)
})

it('releases one part, and its cutlist carries only that part’s lines', () => {
  const { id, movedLine, stayed } = split()
  const before = trimStore.get().cutlists.length

  setReviewed(id, DAY_A, true)
  toggleRelease(id, DAY_A)
  const done = releaseToProduction()

  expect(done).not.toBeNull()
  expect(isReleased(reload(id), DAY_A)).toBe(true)
  expect(isReleased(reload(id), DAY_B)).toBe(false)

  const fresh = trimStore.get().cutlists.slice(before)
  expect(fresh.every(cutlist => cutlist.date === DAY_A)).toBe(true)

  const released = fresh.flatMap(cutlist => cutlist.members.map(member => member.lineId))
  expect(released).not.toContain(movedLine)
  expect(stayed.some(lineId => released.includes(lineId))).toBe(true)
})

it('will not release a part that has not been reviewed', () => {
  const { id } = split()

  toggleRelease(id, DAY_B)

  expect(trimStore.get().releaseIds).toEqual([])
  expect(releaseToProduction()).toBeNull()
})
