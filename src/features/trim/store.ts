import { canonicalCoils, coilLfFromThickness, coilWeightFromLf } from '@/store/shared/coils'
import { createStore } from '@/store/create-store'
import { arrivalKey, forgetOccupant, releaseStamps, shippedKey } from '@/store/shared/locations'
import { unclaimedStockOrders, type PendingStockOrder } from '@/store/shared/stock-orders'
import { withPublishedCaps } from '@/store/shared/settings'

import { PRODUCT_CATALOG } from './catalog'
import seed from './seed.json'

import type { Coil } from '@/store/shared/coils'
import type { DeptRole } from '@/session/dept-role'
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
  // #214: what the operator typed against a row, keyed the way the prototype keys it
  opNotes: {},
  machines: withPublishedCaps(DEPARTMENT, (seed as unknown as TrimState).machines)
})

export const setSearch = (searchTerm: string) => trimStore.set({ searchTerm })

/** Operator notes live on the row group, not on the line — a regroup is a different note. */
export const setOpNote = (key: string, value: string) =>
  trimStore.set(state => ({ opNotes: { ...state.opNotes, [key]: value } }))

/** Follows the sidebar's «Viewing as» — see `useDeptRole`. */
export const setDeptRole = (role: DeptRole) => trimStore.set({ role })

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

/** Extra pieces typed on the Stock Manufacturing tab — no order behind them, hence `orderNo: null`. */
export const createManufacturingBatch = (rows: { qty: number; pid: string; desc: string }[]) => {
  const stamp = nowTime()
  const at = Date.now()

  trimStore.set(state => ({
    stockBatches: [
      ...rows.map((row, index) => ({
        id: `SB${at}-${index}`,
        orderNo: null,
        ts: stamp,
        pid: row.pid,
        desc: row.desc || PRODUCT_CATALOG[row.pid.toUpperCase()] || '—',
        qty: row.qty
      })),
      ...(state.stockBatches as unknown[])
    ]
  }))
}

/* -- stock orders (N-012/013/014, item 12) ------------------------------------------------------ */

const numFromOrderNo = (orderNo: string) => Number(/(\d+)$/.exec(orderNo)?.[1] ?? 0)

/**
 * Stock order numbers continue past whatever the seed and the Stock Cards page already used.
 *
 * A number that came in from a QR intake is already on a card somewhere, so the counter starts above
 * the highest one in the store rather than at a fixed base — otherwise the first order a worker
 * creates by hand would collide with one that already exists.
 */
let stockSeq = 1000

const bumpStockSeq = (orders: TrimState['orders']) => {
  for (const order of orders)
    if (order.type === 'stock') stockSeq = Math.max(stockSeq, numFromOrderNo(order.order))
}

bumpStockSeq(trimStore.get().orders)

let lineSeq = 100000

/** A thin pending record from the Stock Cards screen, as a Trim order of this store's own shape. */
const orderFromPending = (pending: PendingStockOrder) => ({
  id: 8000000 + numFromOrderNo(pending.orderNo),
  order: pending.orderNo,
  type: 'stock' as const,
  customer: 'Stock',
  entryDate: pending.entryDate ?? TODAY,
  shipDate: null,
  priorityId: null,
  reviewed: false,
  released: false,
  productionDate: null,
  isSplit: false,
  notes: [],
  lineItems: [
    {
      id: (lineSeq += 1),
      qty: pending.qty ?? 1,
      productId: pending.pid ?? '',
      description: pending.desc ?? '',
      gaugeColour: pending.gaugeColour ?? '26ga Charcoal',
      width: pending.width ?? 12,
      length: pending.length ?? 120,
      machineId: null,
      fromStock: 0,
      wrapped: 0,
      status: null,
      vented: 0,
      scheduledDate: null,
      notes: []
    }
  ]
})

/**
 * Item 7: a card scanned in the Stock Cards window becomes an order here.
 *
 * The two screens share nothing but `wl_orders_pending_v1`, so this is the whole of the handover, and it
 * has to run in three places: on arrival, on a `storage` event (the window is its own document, so a
 * scan there fires one here), and when that window closes — a write from *this* document fires no event
 * at all. Merging by order number is what keeps a re-run from adding the same card twice.
 */
export const hydrateStockOrders = () => {
  const orders = trimStore.get().orders
  const fresh = unclaimedStockOrders(orders.map(order => order.order))
  if (!fresh.length) return

  const added = fresh.map(orderFromPending)
  bumpStockSeq(added as unknown as TrimState['orders'])
  trimStore.set(state => ({ orders: [...added, ...state.orders] as TrimState['orders'] }))
}

hydrateStockOrders()

export const createStockOrder = (rows: { qty: number; pid: string; desc: string }[]) => {
  stockSeq += 1
  const number = `S${String(stockSeq).padStart(4, '0')}`

  trimStore.set(state => ({
    orders: [
      {
        id: Date.now(),
        order: number,
        type: 'stock' as const,
        customer: 'Stock',
        entryDate: TODAY,
        shipDate: null,
        priorityId: null,
        reviewed: false,
        released: false,
        productionDate: null,
        isSplit: false,
        notes: [],
        lineItems: rows.map(row => ({
          id: (lineSeq += 1),
          qty: row.qty,
          productId: row.pid,
          description: row.desc,
          gaugeColour: '26ga Charcoal',
          width: 12.0,
          length: 120,
          machineId: null,
          fromStock: 0,
          wrapped: 0,
          status: null,
          vented: 0,
          scheduledDate: null,
          notes: []
        }))
      },
      ...state.orders
    ]
  }))

  return number
}

/* -- the Manager's review pass (N-026, N-030, N-037, N-105, N-113, item 165) -------------------- */

/** Item 165: Description and Width are the Manager's to correct, up until the order is released. */
export const setLineField = (
  orderId: number,
  lineId: number,
  patch: Partial<TrimState['orders'][number]['lineItems'][number]>
) => trimStore.set(state => patchLine(state, orderId, lineId, () => patch))

export const setLineMachine = (orderId: number, lineId: number, machineId: number | null) =>
  trimStore.set(state => patchLine(state, orderId, lineId, () => ({ machineId })))

/**
 * N-113: venting is a flag with a quantity behind it, so ticking it means «all of them».
 *
 * A vent count above what is actually being made would be a promise the floor cannot keep, so it is
 * capped at Qty to Manufacture rather than at Qty Ordered — stock pieces are not going through the
 * machine at all.
 */
export const toggleVented = (orderId: number, lineId: number) =>
  trimStore.set(state =>
    patchLine(state, orderId, lineId, item => ({
      vented: (item.vented || 0) > 0 ? 0 : Math.max(0, item.qty - (item.fromStock || 0))
    }))
  )

export const setVented = (orderId: number, lineId: number, value: number) =>
  trimStore.set(state =>
    patchLine(state, orderId, lineId, item => ({
      vented: Math.min(
        Math.max(0, Number.isNaN(value) ? 0 : value),
        Math.max(0, item.qty - (item.fromStock || 0))
      )
    }))
  )

/** Un-reviewing also drops the order from the release selection — it is no longer eligible for it. */
export const setReviewed = (orderId: number, reviewed: boolean) =>
  trimStore.set(state => ({
    orders: state.orders.map(order => (order.id === orderId ? { ...order, reviewed } : order)),
    releaseIds: reviewed ? state.releaseIds : state.releaseIds.filter(id => id !== orderId)
  }))

/**
 * Gate 4: releasing is what turns reviewed orders into work on the floor.
 *
 * Lines are grouped into cutlists by Date × Gauge/Colour × Priority (N-030) — the three things that
 * decide whether two pieces can be cut in one run. A line fully covered by stock generates nothing;
 * there is nothing to make.
 *
 * N-105: the id carries a timestamp, so a second release on the same day and colour opens a *new*
 * cutlist rather than joining one the Slinet may already be part-way through.
 */
export const releaseToProduction = () => {
  const state = trimStore.get()
  if (!state.releaseIds.length) return null

  const releasing = state.orders.filter(order => state.releaseIds.includes(order.id))
  if (!releasing.every(order => order.reviewed)) return null

  const groups = new Map<string, TrimState['cutlists'][number]>()

  for (const order of releasing)
    for (const item of order.lineItems) {
      if (item.qty - (item.fromStock || 0) <= 0) continue

      const key = `${order.productionDate}|${item.gaugeColour}|${order.priorityId || 0}`
      const group = groups.get(key) ?? {
        id: key,
        date: order.productionDate as string,
        gaugeColour: item.gaugeColour,
        priorityId: order.priorityId,
        members: [],
        slinetStarted: false,
        doneSlinet: false,
        doneMachines: []
      }
      group.members.push({ orderId: order.id, lineId: item.id })
      groups.set(key, group)
    }

  const stamp = Date.now()
  const cutlists = [...groups.values()].map(group => ({ ...group, id: `${group.id}|${stamp}` }))

  trimStore.set(current => ({
    orders: current.orders.map(order =>
      !current.releaseIds.includes(order.id)
        ? order
        : {
            ...order,
            released: true,
            // N-037: a line covered entirely by stock is already done; the rest starts at the beginning
            lineItems: order.lineItems.map(item => ({
              ...item,
              status: (item.fromStock || 0) >= item.qty ? 'stock' : 'not_started'
            }))
          }
    ),
    cutlists: [...current.cutlists, ...cutlists],
    releaseIds: []
  }))

  return { orders: releasing.length, cutlists: cutlists.length }
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

/**
 * N-053: sending a line to a different machine pulls it onto a new bendlist of its own.
 *
 * It cannot stay on the old one — that list is the other machine's work — and it cannot join an
 * existing list on the new machine either, because those were consolidated for a run that is already
 * planned. A line already cut carries that fact across: the new list opens with the Slinet's half
 * already done, so the receiving machine is not made to wait for a cut that has happened.
 */
export const reassignMachine = (orderId: number, lineId: number, machineId: number) =>
  trimStore.set(state => {
    const order = state.orders.find(candidate => candidate.id === orderId)
    const item = order?.lineItems.find(candidate => candidate.id === lineId)
    if (!order || !item) return {}

    const alreadyCut = (RANK[item.status ?? ''] || 0) >= RANK.cut!

    return {
      cutlists: [
        ...state.cutlists.map(cutlist => ({
          ...cutlist,
          members: cutlist.members.filter(
            member => !(member.orderId === orderId && member.lineId === lineId)
          )
        })),
        {
          id: `reassign|${orderId}-${lineId}|${Date.now()}`,
          date: order.productionDate as string,
          gaugeColour: item.gaugeColour,
          priorityId: order.priorityId,
          members: [{ orderId, lineId }],
          slinetStarted: alreadyCut,
          doneSlinet: alreadyCut,
          doneMachines: []
        }
      ],
      orders: state.orders.map(candidate =>
        candidate.id !== orderId
          ? candidate
          : {
              ...candidate,
              lineItems: candidate.lineItems.map(line =>
                line.id === lineId ? { ...line, machineId } : line
              )
            }
      )
    }
  })

/** N-056: a station signs off its whole list. `key` is 'slinet' or a machine id. */
export const markBatchDone = (batchId: string, key: 'slinet' | number) =>
  trimStore.set(state => {
    /* #215: the sign-off is stamped, so a completed list can say when it was finished. */
    const at = new Date().toISOString()

    return {
      cutlists: state.cutlists.map(batch =>
        batch.id !== batchId
          ? batch
          : key === 'slinet'
            ? { ...batch, doneSlinet: true, doneSlinetAt: at }
            : {
                ...batch,
                doneMachines: [...(batch.doneMachines || []), key],
                doneMachineAt: { ...(batch.doneMachineAt || {}), [key]: at }
              }
      )
    }
  })

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
  trimStore.set(state => {
    const at = new Date().toISOString()

    return {
      remans: state.remans.map(reman =>
        reman.id === id
          ? {
              ...reman,
              [which === 'slinet' ? 'slinetDone' : 'machineDone']: true,
              [which === 'slinet' ? 'slinetDoneAt' : 'machineDoneAt']: at
            }
          : reman
      )
    }
  })

/* -- wrapping: locations and packages (N-081..095) ---------------------------------------------- */

/** Trim is department 01, and that is the first field of every barcode it prints. */
const DEPT_CODE = '01'

const stampArrival = (locationId: number, orderId: number, at: number) => {
  const store = releaseStamps('trim')
  const next = { ...store.get() }
  delete next[shippedKey(locationId, orderId)]
  next[arrivalKey(locationId, orderId)] = at
  store.set(next)
}

export const assignLocation = (orderId: number, locationId: number) => {
  const at = Date.now()

  trimStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? { ...order, locationIds: [...(order.locationIds ?? []), locationId] }
        : order
    ),
    locations: state.locations.map(location =>
      location.id === locationId
        ? {
            ...location,
            occupants: [...(location.occupants ?? []), { orderId, weight: 0, lastScanAt: at }]
          }
        : location
    )
  }))

  stampArrival(locationId, orderId, at)
}

export const removeLocation = (orderId: number, locationId: number) => {
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? { ...order, locationIds: (order.locationIds ?? []).filter(id => id !== locationId) }
        : order
    ),
    locations: state.locations.map(location =>
      location.id === locationId
        ? {
            ...location,
            occupants: (location.occupants ?? []).filter(occupant => occupant.orderId !== orderId)
          }
        : location
    )
  }))

  forgetOccupant('trim', locationId, orderId)
}

/**
 * N-088/089: one package off the staged quantities, onto the order's active location.
 *
 * The weight is the trims', never typed. Each line records where it stood before, so deleting the
 * package can put it back; a line whose whole quantity is now wrapped flips to Wrapped on its own.
 */
export const createPackage = (
  orderId: number,
  locationId: number,
  staged: { lineId: number; qty: number }[],
  weight: number
) => {
  const state = trimStore.get()
  const order = state.orders.find(candidate => candidate.id === orderId)
  const location = state.locations.find(candidate => candidate.id === locationId)
  if (!order || !location || !staged.length) return null

  const seq = (order.pkgSeq ?? 0) + 1
  const barcode = `${DEPT_CODE}-${order.order}-${String(seq).padStart(2, '0')}`

  const lines = staged.map(entry => {
    const item = order.lineItems.find(candidate => candidate.id === entry.lineId)!
    return {
      lineId: entry.lineId,
      qty: entry.qty,
      prevStatus: item.status || 'bent',
      prevWrapped: item.wrapped || 0
    }
  })

  const pkg = {
    barcode,
    seq,
    contents: lines
      .map(
        line =>
          `${line.qty} × ${order.lineItems.find(item => item.id === line.lineId)?.productId ?? ''}`
      )
      .join(', '),
    locId: locationId,
    locName: location.code,
    qty: lines.reduce((sum, line) => sum + line.qty, 0),
    weight,
    deleted: false,
    lines
  }

  const at = Date.now()
  const isNewOccupant = !(location.occupants ?? []).some(occupant => occupant.orderId === orderId)

  trimStore.set(current => ({
    orders: current.orders.map(candidate =>
      candidate.id !== orderId
        ? candidate
        : {
            ...candidate,
            pkgSeq: seq,
            packages: [...(candidate.packages ?? []), pkg],
            lineItems: candidate.lineItems.map(item => {
              const line = lines.find(entry => entry.lineId === item.id)
              if (!line) return item

              const wrapped = (item.wrapped || 0) + line.qty
              return { ...item, wrapped, status: wrapped >= item.qty ? 'wrapped' : line.prevStatus }
            })
          }
    ),
    locations: current.locations.map(candidate => {
      if (candidate.id !== locationId) return candidate

      const occupants = candidate.occupants ?? []
      return {
        ...candidate,
        occupants: occupants.some(occupant => occupant.orderId === orderId)
          ? occupants.map(occupant =>
              occupant.orderId === orderId
                ? { ...occupant, weight: occupant.weight + weight }
                : occupant
            )
          : [...occupants, { orderId, weight, lastScanAt: at }]
      }
    })
  }))

  if (isNewOccupant) stampArrival(locationId, orderId, at)

  return pkg
}

/**
 * §6.2 / N-095: a soft delete. The barcode is tombstoned rather than dropped, because the label is
 * already printed and scanning it has to report a deleted package rather than an unknown one. The
 * pieces go back to Wrapping, and an order that had completed reopens.
 */
export const deletePackage = (orderId: number, barcode: string) =>
  trimStore.set(state => {
    const order = state.orders.find(candidate => candidate.id === orderId)
    const pkg = order?.packages?.find(candidate => candidate.barcode === barcode)
    if (!order || !pkg || pkg.deleted) return {}

    return {
      orders: state.orders.map(candidate =>
        candidate.id !== orderId
          ? candidate
          : {
              ...candidate,
              completed: false,
              packages: (candidate.packages ?? []).map(entry =>
                entry.barcode === barcode ? { ...entry, deleted: true } : entry
              ),
              lineItems: candidate.lineItems.map(item => {
                const line = pkg.lines.find(entry => entry.lineId === item.id)
                if (!line) return item

                const wrapped = Math.max(0, (item.wrapped || 0) - line.qty)
                return {
                  ...item,
                  wrapped,
                  status: wrapped >= item.qty ? item.status : line.prevStatus || 'bent'
                }
              })
            }
      ),
      locations: !pkg.locId
        ? state.locations
        : state.locations.map(location =>
            location.id !== pkg.locId
              ? location
              : {
                  ...location,
                  occupants: (location.occupants ?? []).map(occupant =>
                    occupant.orderId === orderId
                      ? { ...occupant, weight: Math.max(0, occupant.weight - pkg.weight) }
                      : occupant
                  )
                }
          )
    }
  })

/** N-073: everything wrapped, so the order leaves the floor as one final C_MFG batch. */
export const completeOrder = (orderId: number) =>
  trimStore.set(state => ({
    orders: state.orders.map(order =>
      order.id === orderId
        ? { ...order, completed: true, completedDate: TODAY, completedTime: nowTime() }
        : order
    )
  }))

/* -- coils on the Slinet (N-109/121, #193) ------------------------------------------------------ */

/**
 * Push one coil's changed fields into the shared inventory (N-117).
 *
 * Trim keeps its own copy of the coil list, so an edit made here is invisible to the Coils page and to
 * Rollforming until it is mirrored across. It matches on Coil # rather than id because the two lists
 * are seeded separately, and it writes only the fields Trim can change — the rest belong to whoever
 * received the coil.
 */
const syncCoilToCanonical = (coilNumber: string) => {
  if (!coilNumber) return

  const canonical = canonicalCoils.get()
  if (!canonical) return

  const mine = trimStore.get().coils.find(coil => coil.coilNumber === coilNumber)
  if (!mine) return

  let matched = false
  const merged = canonical.map(coil => {
    if (coil.coilNumber !== coilNumber) return coil
    matched = true
    return {
      ...coil,
      thickness: mine.thickness,
      linearFeet: mine.linearFeet,
      weight: mine.weight,
      materialThickness: mine.materialThickness,
      coreOD: mine.coreOD,
      locTrim: mine.locTrim,
      locRollforming: mine.locRollforming,
      slinetIn: mine.slinetIn,
      note: mine.note
    }
  })

  if (matched) canonicalCoils.set(merged)
}

const removeCoilFromCanonical = (coilNumber: string) => {
  const canonical = canonicalCoils.get()
  if (canonical) canonicalCoils.set(canonical.filter(coil => coil.coilNumber !== coilNumber))
}

const coilNumberOf = (coilId: Coil['id']) =>
  trimStore.get().coils.find(coil => coil.id === coilId)?.coilNumber ?? ''

export const toggleSlinet = (coilId: Coil['id']) => {
  trimStore.set(state => ({
    coils: state.coils.map(coil =>
      coil.id === coilId ? { ...coil, slinetIn: !coil.slinetIn } : coil
    )
  }))
  syncCoilToCanonical(coilNumberOf(coilId))
}

/**
 * N-117: the coil inventory is shared, but a coil is checked into one department at a time.
 *
 * Ticking Trim clears Rollforming and the other way round — a coil is in one place, and letting both
 * boxes be ticked would let two departments plan around the same steel. Taking a coil out of Trim also
 * takes it off the Slinet, because the Slinet is a machine in Trim.
 */
export const toggleCoilLocation = (coilId: Coil['id'], flag: 'locTrim' | 'locRollforming') => {
  trimStore.set(state => {
    const target = state.coils.find(coil => coil.id === coilId)
    if (!target) return {}

    const other = flag === 'locTrim' ? 'locRollforming' : 'locTrim'

    return {
      coils: state.coils.map(coil =>
        coil.id !== coilId
          ? coil
          : {
              ...coil,
              [flag]: !target[flag],
              [other]: false,
              slinetIn: flag === 'locTrim' && target.locTrim ? false : coil.slinetIn
            }
      )
    }
  })
  syncCoilToCanonical(coilNumberOf(coilId))
}

export const setCoilNote = (coilId: Coil['id'], note: string) => {
  trimStore.set(state => ({
    coils: state.coils.map(coil => (coil.id === coilId ? { ...coil, note } : coil))
  }))
  syncCoilToCanonical(coilNumberOf(coilId))
}

/**
 * #193: the operator reports the build-up on the roll, and the rest follows from it.
 *
 * Coil Thickness is the one measurement anyone can take without unwinding the coil, so Linear Feet and
 * Weight are derived from it rather than asked for. Zero is not a small number here — it means the
 * coil is spent, and the row goes to zero across the board rather than to a tiny remainder.
 */
export const setCoilThickness = (
  coilId: Coil['id'],
  thickness: number,
  matThk: number,
  coreOD: number
) => {
  trimStore.set(state => ({
    coils: state.coils.map(coil => {
      if (coil.id !== coilId) return coil
      if (thickness === 0) return { ...coil, thickness: 0, linearFeet: 0, weight: 0 }

      const linearFeet = coilLfFromThickness(thickness, matThk, coreOD)
      return {
        ...coil,
        thickness,
        linearFeet,
        weight: coilWeightFromLf(linearFeet, coil.width, matThk)
      }
    })
  }))
  syncCoilToCanonical(coilNumberOf(coilId))
}

/** #193's Apply: the three cross-adjusted numbers, plus the geometry they were solved with. */
export const adjustCoil = (
  coilId: Coil['id'],
  patch: {
    thickness: number
    linearFeet: number
    weight: number
    materialThickness: number
    coreOD: number
  }
) => {
  trimStore.set(state => ({
    coils: state.coils.map(coil => (coil.id === coilId ? { ...coil, ...patch } : coil))
  }))
  syncCoilToCanonical(coilNumberOf(coilId))
}

/** A coil entered as 0 is spent: it leaves both lists rather than sitting at zero feet. */
export const depleteCoil = (coilId: Coil['id']) => {
  const coilNumber = coilNumberOf(coilId)
  trimStore.set(state => ({ coils: state.coils.filter(coil => coil.id !== coilId) }))
  removeCoilFromCanonical(coilNumber)
}

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
