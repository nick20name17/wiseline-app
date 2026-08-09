import { createStore } from '@/store/create-store'
import { withPublishedCaps } from '@/store/shared/settings'

import seed from './seed.json'

import type { Note, TrimState } from './types'

/**
 * The prototype pins its own clock so the demo reads the same on any day it is opened. Every date in
 * the seed is relative to this one, and the day strips walk forward from it.
 */
export const TODAY = '2026-07-14'

/** Trim is department 01; the code shows in the header chip and prefixes every package barcode. */
export const DEPARTMENT = 'Trim'

/**
 * `seed.json` is the prototype's own `store.get()`, dumped rather than retyped — see
 * `tools/port/dump-seed.ts`. Machine capacities are the one part of it Settings may have overridden
 * since, so they are re-read on load exactly as the prototype re-reads them.
 */
export const trimStore = createStore<TrimState>({
  ...(seed as unknown as TrimState),
  // not in the dump: the prototype keeps its open cards outside the store
  expandedBatches: [],
  machines: withPublishedCaps(DEPARTMENT, (seed as unknown as TrimState).machines)
})

export const setSearch = (searchTerm: string) => trimStore.set({ searchTerm })

export const toggleExpand = (orderId: number) =>
  trimStore.set(state => ({
    expandedIds: state.expandedIds.includes(orderId)
      ? state.expandedIds.filter(id => id !== orderId)
      : [...state.expandedIds, orderId]
  }))

export const toggleOrderSelect = (orderId: number) =>
  trimStore.set(state => ({
    selectedOrderIds: state.selectedOrderIds.includes(orderId)
      ? state.selectedOrderIds.filter(id => id !== orderId)
      : [...state.selectedOrderIds, orderId]
  }))

export const setPriority = (orderId: number, priorityId: number | null) =>
  trimStore.set(state => ({
    orders: state.orders.map(order => (order.id === orderId ? { ...order, priorityId } : order))
  }))

export const clearPeekDay = () => trimStore.set({ peekDay: null })

/** Changing the day drops the release selection: it was made against the day that is going away. */
export const setScheduledDay = (scheduledDay: string) =>
  trimStore.set({ scheduledDay, releaseIds: [] })

/** Gate 3 (N-026): an order can only be picked for release once it has been Reviewed. */
export const toggleRelease = (orderId: number) =>
  trimStore.set(state => {
    const order = state.orders.find(candidate => candidate.id === orderId)
    if (!order || order.released || !order.reviewed) return {}

    return {
      releaseIds: state.releaseIds.includes(orderId)
        ? state.releaseIds.filter(id => id !== orderId)
        : [...state.releaseIds, orderId]
    }
  })

/** Picking lines for a split belongs to one order at a time; the last empty selection releases it. */
export const toggleLineSelect = (orderId: number, lineId: number) =>
  trimStore.set(state => {
    const ids = state.splitOrderId === orderId ? state.selectedLineIds : []
    const next = ids.includes(lineId) ? ids.filter(id => id !== lineId) : [...ids, lineId]
    return { splitOrderId: next.length ? orderId : null, selectedLineIds: next }
  })

export const setProdMode = (prodMode: string) => trimStore.set({ prodMode })

export const setProdListMode = (prodListMode: string) => trimStore.set({ prodListMode })

export const setActiveMachine = (activeMachine: number) => trimStore.set({ activeMachine })

export const toggleBatchExpand = (key: string) =>
  trimStore.set(state => ({
    expandedBatches: state.expandedBatches.includes(key)
      ? state.expandedBatches.filter(open => open !== key)
      : [...state.expandedBatches, key]
  }))

/* -- scheduling (N-006/007, N-041/042, N-160) -------------------------------------------------- */

/**
 * Rescheduling or unscheduling resets what the Manager had already decided.
 *
 * Verbatim from the canvas: an order that moves day loses its Priority, its Reviewed tick, its machine
 * assignments and its # From Stock. The reasoning is that those were judgements about a particular
 * day's run, and the day is what changed.
 */
const resetManagerEdits = <T extends object>(item: T, extra: Partial<T>) => ({
  ...item,
  machineId: null,
  fromStock: 0,
  status: null,
  ...extra
})

/** An order is split while its lines sit on different days, and dated by the earliest of them. */
const redate = (lineItems: TrimState['orders'][number]['lineItems']) => {
  const dates = lineItems.map(item => item.scheduledDate)
  const sameDay = new Set(dates).size === 1
  return {
    lineItems,
    isSplit: !sameDay,
    productionDate: sameDay ? dates[0]! : dates.filter(Boolean).sort()[0]!
  }
}

/** N-160: the order-level tick schedules only the trim still unscheduled; split lines keep their day. */
export const scheduleOrders = (orderIds: number[], iso: string) =>
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      orderIds.includes(order.id)
        ? {
            ...order,
            ...redate(
              order.lineItems.map(item =>
                item.scheduledDate ? item : { ...item, scheduledDate: iso }
              )
            )
          }
        : order
    ),
    selectedOrderIds: []
  }))

/** N-006/007: the order stays in Unscheduled until every line has a day. */
export const scheduleLines = (orderId: number, lineIds: number[], iso: string) =>
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? {
            ...order,
            ...redate(
              order.lineItems.map(item =>
                lineIds.includes(item.id) ? { ...item, scheduledDate: iso } : item
              )
            )
          }
        : order
    ),
    selectedLineIds: [],
    splitOrderId: null
  }))

export const rescheduleOrder = (orderId: number, iso: string) =>
  trimStore.set(state => ({
    scheduledDay: iso,
    orders: state.orders.map(order =>
      order.id === orderId
        ? {
            ...order,
            productionDate: iso,
            priorityId: null,
            reviewed: false,
            isSplit: false,
            lineItems: order.lineItems.map(item => resetManagerEdits(item, { scheduledDate: iso }))
          }
        : order
    )
  }))

export const unscheduleOrder = (orderId: number) =>
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? {
            ...order,
            productionDate: null,
            isSplit: false,
            reviewed: false,
            priorityId: null,
            lineItems: order.lineItems.map(item => resetManagerEdits(item, { scheduledDate: null }))
          }
        : order
    )
  }))

/** Straight to Wrapping: no Slinet, no machines, and today's date, because it is being done now. */
export const bypassProduction = (orderIds: number[]) =>
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      orderIds.includes(order.id)
        ? {
            ...order,
            bypassed: true,
            released: true,
            productionDate: TODAY,
            isSplit: false,
            lineItems: order.lineItems.map(item => ({
              ...item,
              scheduledDate: TODAY,
              status: 'bypassed'
            }))
          }
        : order
    ),
    releaseIds: [],
    selectedOrderIds: []
  }))

export const setPeekDay = (peekDay: string | null) => trimStore.set({ peekDay })

/* -- quantities typed on the floor (N-061..072, #185) ------------------------------------------ */

const patchLine = (
  state: TrimState,
  orderId: number,
  lineId: number,
  patch: (item: TrimState['orders'][number]['lineItems'][number]) => object
) => ({
  orders: state.orders.map(order =>
    order.id === orderId
      ? {
          ...order,
          lineItems: order.lineItems.map(item =>
            item.id === lineId ? { ...item, ...patch(item) } : item
          )
        }
      : order
  )
})

/** N-071/072: what a worker pulls from stock instead of making. Never more than the order asked for. */
export const setFromStock = (orderId: number, lineId: number, value: number) =>
  trimStore.set(state =>
    patchLine(state, orderId, lineId, item => ({
      fromStock: Math.max(0, Math.min(item.qty, Number.isNaN(value) ? 0 : value))
    }))
  )

/** Only what is not already in a manufacturing batch is still wrappable. */
export const wrapMax = (item: { qty: number; qtyManufactured?: number }) =>
  Math.max(0, item.qty - (item.qtyManufactured || 0))

/**
 * #185: dropping the wrapped count back to zero also drops the row out of the batch selection —
 * a row with nothing wrapped has nothing to push.
 */
export const setWrapped = (orderId: number, lineId: number, value: number) =>
  trimStore.set(state => ({
    ...patchLine(state, orderId, lineId, () => ({ wrapped: value })),
    stockWrapChecked:
      value > 0 ? state.stockWrapChecked : state.stockWrapChecked.filter(id => id !== lineId)
  }))

/**
 * A remanufacture request fans out into two lists that inherit the line's date, colour, priority and
 * machine: a recut cutlist for the Slinet and a bendlist for the machine. One record holds both, and
 * its two flags are the two gates the colour of the Remanufacture column reads.
 *
 * A machine-raised request also pulls the line out of the bendlist it is in (N-061); one raised from
 * Wrapping leaves it where it is, because it is already cut and bent and only needs remaking.
 */
export const addReman = (
  source: 'machine' | 'wrapping',
  orderId: number,
  lineId: number,
  qty: number
) =>
  trimStore.set(state => {
    const order = state.orders.find(candidate => candidate.id === orderId)
    const item = order?.lineItems.find(candidate => candidate.id === lineId)
    if (!order || !item || qty < 1 || qty > item.qty) return {}

    const from = state.cutlists.find(cutlist =>
      cutlist.members.some(member => member.orderId === orderId && member.lineId === lineId)
    )

    return {
      remans: [
        ...state.remans,
        {
          id: `R${Date.now()}`,
          orderId,
          lineId,
          orderNo: order.order,
          productId: item.productId,
          description: item.description,
          gaugeColour: item.gaugeColour,
          width: item.width,
          length: item.length,
          qty,
          machineId: item.machineId as number,
          priorityId: order.priorityId,
          date: order.productionDate as string,
          source,
          fromCutlistId: from ? from.id : null,
          recut: false,
          bent: false,
          slinetDone: false,
          machineDone: false
        }
      ],
      cutlists:
        source === 'machine'
          ? state.cutlists.map(cutlist => ({
              ...cutlist,
              members: cutlist.members.filter(
                member => !(member.orderId === orderId && member.lineId === lineId)
              )
            }))
          : state.cutlists
    }
  })

export const toggleStockWrapCheck = (lineId: number) =>
  trimStore.set(state => ({
    stockWrapChecked: state.stockWrapChecked.includes(lineId)
      ? state.stockWrapChecked.filter(id => id !== lineId)
      : [...state.stockWrapChecked, lineId]
  }))

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

/**
 * #185: pushing the ticked rows to EBMS as one manufacturing batch.
 *
 * Wrapped moves into Qty. Manufactured and resets, because the pieces have left the wrapping bench.
 * Once every row of the order is fully manufactured the stock order has nothing left to make, so it
 * leaves Wrapping for Completed Orders — returned here rather than watched for, so the caller can say
 * which of the two things happened.
 */
export const createStockWrapBatch = (orderId: number, lineIds: number[]) => {
  const stamp = nowTime()

  trimStore.set(state => {
    const order = state.orders.find(candidate => candidate.id === orderId)
    if (!order) return {}

    const picked = order.lineItems.filter(item => lineIds.includes(item.id))

    const orders = state.orders.map(candidate => {
      if (candidate.id !== orderId) return candidate

      const lineItems = candidate.lineItems.map(item => {
        if (!lineIds.includes(item.id)) return item
        const made = (item.qtyManufactured || 0) + (item.wrapped || 0)
        return {
          ...item,
          qtyManufactured: made,
          wrapped: 0,
          status: made >= item.qty ? 'wrapped' : item.status
        }
      })

      const allBatched = lineItems.every(item => (item.qtyManufactured || 0) >= item.qty)
      return allBatched
        ? {
            ...candidate,
            lineItems,
            completed: true,
            completedDate: TODAY,
            completedTime: stamp
          }
        : { ...candidate, lineItems }
    })

    return {
      orders,
      stockWrapChecked: state.stockWrapChecked.filter(id => !lineIds.includes(id)),
      // newest first — the same order the Stock Manufacturing history reads in
      stockBatches: [
        ...picked.map(item => ({
          id: `swb-${item.id}-${Date.now()}`,
          ts: stamp,
          pid: item.productId,
          desc: item.description,
          qty: item.wrapped || 0,
          orderNo: order.order
        })),
        ...(state.stockBatches as unknown[])
      ]
    }
  })

  return !!trimStore.get().orders.find(order => order.id === orderId)?.completed
}

/* -- production: cut, bent, done (N-051..056) --------------------------------------------------- */

/** How far a line has got. Status never moves backwards, so comparing ranks is the whole gate. */
export const RANK: Record<string, number> = {
  not_started: 1,
  in_progress: 2,
  cut: 3,
  bent: 4,
  wrapped: 5
}

/**
 * A line only ever moves forward through the stations, which is why this takes the step rather than
 * setting it: a machine marking Bent on a line the Slinet has already cut must not undo the cut, and
 * a line pulled from stock skips straight to wrapped or stays where it is.
 */
const advance = <T extends { status: string | null }>(item: T, next: string): T => {
  if (item.status === 'wrapped') return item
  if (item.status === 'stock') return next === 'wrapped' ? { ...item, status: 'wrapped' } : item
  return (RANK[next] || 0) > (RANK[item.status ?? ''] || 0) ? { ...item, status: next } : item
}

const advanceLines = (
  state: TrimState,
  refs: { orderId: number; lineId: number }[],
  next: string,
  gate?: (item: TrimState['orders'][number]['lineItems'][number]) => boolean
) => ({
  orders: state.orders.map(order => {
    const mine = refs.filter(ref => ref.orderId === order.id)
    if (!mine.length) return order

    return {
      ...order,
      lineItems: order.lineItems.map(item =>
        mine.some(ref => ref.lineId === item.id) && (!gate || gate(item))
          ? advance(item, next)
          : item
      )
    }
  })
})

/**
 * N-051: the Slinet is the gateway. The first Cut on a cutlist flips the *whole* list to In Progress
 * across every machine, because the machines downstream are now waiting on material that exists.
 */
export const slinetCutGroup = (batchId: string, refs: { orderId: number; lineId: number }[]) =>
  trimStore.set(state => {
    const batch = state.cutlists.find(candidate => candidate.id === batchId)
    const started =
      batch && !batch.slinetStarted
        ? {
            cutlists: state.cutlists.map(candidate =>
              candidate.id === batchId ? { ...candidate, slinetStarted: true } : candidate
            ),
            ...advanceLines(
              state,
              batch.members,
              'in_progress',
              item => item.status === 'not_started'
            )
          }
        : null

    return {
      ...started,
      ...advanceLines(started ? { ...state, ...started } : state, refs, 'cut')
    }
  })

/** N-055: a machine can only mark Bent once the line is past Not Started — the Slinet has to cut first. */
export const machineCompleteGroup = (refs: { orderId: number; lineId: number }[]) =>
  trimStore.set(state =>
    advanceLines(state, refs, 'bent', item => !!item.status && item.status !== 'not_started')
  )

/** Reopening drops only the lines sitting *at* this station's step; anything further along stays. */
export const revertRowComplete = (refs: { orderId: number; lineId: number }[], isSlinet: boolean) =>
  trimStore.set(state => {
    const step = isSlinet ? 'cut' : 'bent'
    return {
      orders: state.orders.map(order => {
        const mine = refs.filter(ref => ref.orderId === order.id)
        if (!mine.length) return order

        return {
          ...order,
          lineItems: order.lineItems.map(item =>
            mine.some(ref => ref.lineId === item.id) && item.status === step
              ? { ...item, status: 'in_progress' }
              : item
          )
        }
      })
    }
  })

/** N-056: a station signs off its whole list. `key` is 'slinet' or a machine id. */
export const markBatchDone = (batchId: string, key: 'slinet' | number) =>
  trimStore.set(state => ({
    cutlists: state.cutlists.map(batch =>
      batch.id !== batchId
        ? batch
        : key === 'slinet'
          ? { ...batch, doneSlinet: true }
          : { ...batch, doneMachines: [...(batch.doneMachines || []), key] }
    )
  }))

/**
 * The two halves of a remanufacture close independently, and in order.
 *
 * The Slinet marking the recut Cut greens the Remanufacture cell in the *machine* tab; the Wrapping
 * tab stays orange until the machine marks the reman Bent. Reopening either half also reopens the
 * Done that followed it — a list cannot be closed over a row that is no longer complete.
 */
export const setRemanFlag = (id: string, flag: 'recut' | 'bent', value: boolean) =>
  trimStore.set(state => ({
    remans: state.remans.map(reman =>
      reman.id !== id
        ? reman
        : flag === 'recut'
          ? { ...reman, recut: value, slinetDone: value && reman.slinetDone }
          : { ...reman, bent: value, machineDone: value && reman.machineDone }
    )
  }))

export const remanListDone = (id: string, which: 'slinet' | 'machine') =>
  trimStore.set(state => ({
    remans: state.remans.map(reman =>
      reman.id === id
        ? { ...reman, [which === 'slinet' ? 'slinetDone' : 'machineDone']: true }
        : reman
    )
  }))

/* -- notes ------------------------------------------------------------------------------------- */

export const addLineNote = (orderId: number, lineId: number, note: Note) =>
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? {
            ...order,
            lineItems: order.lineItems.map(item =>
              item.id === lineId ? { ...item, notes: [...(item.notes ?? []), note] } : item
            )
          }
        : order
    )
  }))

/** Acknowledging is reversible: the red dot is a claim about attention, not a permanent state. */
export const setNoteDealt = (
  ctx: { orderId: number; lineId: number | null },
  noteId: number,
  dealt: boolean
) =>
  trimStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== ctx.orderId) return order

      const mark = (notes: Note[]) =>
        notes.map(note => (note.id === noteId ? { ...note, dealt } : note))

      return ctx.lineId == null
        ? { ...order, notes: mark(order.notes ?? []) }
        : {
            ...order,
            lineItems: order.lineItems.map(item =>
              item.id === ctx.lineId ? { ...item, notes: mark(item.notes ?? []) } : item
            )
          }
    })
  }))
