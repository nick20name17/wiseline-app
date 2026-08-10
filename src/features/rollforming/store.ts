import { createStore } from '@/store/create-store'

import { buildLineItem } from './line-item'
import seed from './seed.json'
import { showToast } from './ui'

import type { Note, Order, RollformingState } from './types'
import type { NoteCtx } from './components/note-modal'

/** The prototype pins its own clock; every date in the seed is relative to this one. */
export const TODAY = '2026-07-15'

/** Rollforming is department 02; the code shows in the header chip and prefixes every barcode. */
export const DEPARTMENT = 'Rollforming'

/** Production date capacity, in linear feet. */
export const CAP_PER_DAY = 6000

/**
 * `seed.json` is the prototype's own `store.get()`, dumped rather than retyped — see
 * `tools/port/dump-seed.ts`. A quarter of the review comments anchor to ids built out of it.
 */
export const rollformingStore = createStore<RollformingState>(seed as unknown as RollformingState)

export const setSearch = (searchTerm: string) => rollformingStore.set({ searchTerm })

export const setActiveGroup = (activeGroup: string) => rollformingStore.set({ activeGroup })

/**
 * Switching between the three worker stations, which is not the same thing as the cross-page
 * "Viewing as" — moving to the Slit Line must not tell the other departments the role changed.
 *
 * Each station lands where it works: the Slit Line Worker on his own group, the Wrapping Worker on
 * everything, since he wraps whatever comes off any machine.
 */
export const setActor = (role: string) =>
  rollformingStore.set(
    role === 'slw'
      ? { role, activeGroup: 'Slit Line' }
      : role === 'ww'
        ? { role, activeGroup: 'All' }
        : { role }
  )

export const toggleExpand = (orderId: number) =>
  rollformingStore.set(state => ({
    expandedIds: state.expandedIds.includes(orderId)
      ? state.expandedIds.filter(id => id !== orderId)
      : [...state.expandedIds, orderId]
  }))

export const toggleOrderSelect = (orderId: number) =>
  rollformingStore.set(state => ({
    selectedOrderIds: state.selectedOrderIds.includes(orderId)
      ? state.selectedOrderIds.filter(id => id !== orderId)
      : [...state.selectedOrderIds, orderId]
  }))

export const setPriority = (orderId: number, priorityId: number | null) => {
  const order = rollformingStore.get().orders.find(candidate => candidate.id === orderId)
  if (!order || order.priorityId === priorityId) return

  rollformingStore.set(state => ({
    orders: state.orders.map(candidate =>
      candidate.id === orderId ? { ...candidate, priorityId } : candidate
    )
  }))

  // #184: priority stays settable after release, and the Queue is derived — it regroups on its own
  if (order.released) showToast('Priority updated · Queue regrouped')
}

/** Picking lines for a split belongs to one order at a time; a pick on another order replaces it. */
export const toggleLineSelect = (orderId: number, lineId: number) =>
  rollformingStore.set(state => {
    const ids = state.splitOrderId === orderId ? state.selectedLineIds : []
    const next = ids.includes(lineId) ? ids.filter(id => id !== lineId) : [...ids, lineId]
    return { splitOrderId: orderId, selectedLineIds: next }
  })

export const toggleSortByProductId = (orderId: number) =>
  rollformingStore.set(state => ({
    sortByProductId: {
      ...state.sortByProductId,
      [orderId]: !state.sortByProductId[orderId]
    }
  }))

/**
 * Ticking a unit for assignment. The selection belongs to one order *and one profile* — a coil serves
 * one profile, so ticking a unit of another replaces the selection rather than adding to it.
 */
export const toggleCoilUnitSelect = (orderId: number, lineId: number, coilIdx: number) => {
  const order = rollformingStore.get().orders.find(candidate => candidate.id === orderId)
  const item = order?.lineItems.find(candidate => candidate.id === lineId)
  if (!item) return

  const key = `${lineId}:${coilIdx}`
  rollformingStore.set(state => {
    const ctx = state.selectedCoilCtx
    if (!ctx || ctx.orderId !== orderId || ctx.profile !== item.profile)
      return { selectedCoilCtx: { orderId, profile: item.profile, units: [key] } }

    const units = ctx.units.includes(key)
      ? ctx.units.filter(unit => unit !== key)
      : [...ctx.units, key]
    return { selectedCoilCtx: units.length ? { orderId, profile: item.profile, units } : null }
  })
}

/** Picking Export picks Release with it: an order cannot be exported without going to production. */
export const toggleExportSel = (orderId: number) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== orderId || !order.reviewed || order.released) return order
      const on = !order.exportSel
      return { ...order, exportSel: on, releaseSel: on ? true : order.releaseSel }
    })
  }))

/** Dropping Release drops Export with it, for the same reason. */
export const toggleReleaseSel = (orderId: number) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== orderId || !order.reviewed || order.released) return order
      const on = !order.releaseSel
      return { ...order, releaseSel: on, exportSel: on ? order.exportSel : false }
    })
  }))

/* -- material requests --------------------------------------------------------------------------- */

let requestSeq = 411

/**
 * Order origin #2: raw coil a Rollforming machine is asking for.
 *
 * It carries no customer, no ship date and no salesman, because nobody bought it — the machine needs
 * material. That is also why it never splits: there is one line and one coil behind it.
 */
export const createMaterialRequest = (form: {
  profile: string
  gauge: string
  thickness: string
  color: string
  width: string
  linearFeet: string
  priorityId: number | null
  supplierId: number | null
}) => {
  requestSeq += 1
  const number = `MR-704${requestSeq % 100}`

  const order: Order = {
    id: Date.now(),
    order: number,
    originType: 'material_request',
    requestedBy: 'Material Request from Rollformer',
    customer: '—',
    entryDate: TODAY,
    shipDate: null,
    priorityId: form.priorityId,
    reviewed: false,
    released: false,
    exported: false,
    productionDate: null,
    isSplit: false,
    notes: [],
    lineItems: [
      buildLineItem({
        profile: form.profile,
        gauge: Number.parseFloat(form.gauge) || 26,
        thickness: Number.parseFloat(form.thickness) || 0.018,
        width: Number.parseFloat(form.width) || 40,
        color: form.color,
        qty: 1,
        length: null,
        linearFeet: Number.parseInt(form.linearFeet, 10) || 1000,
        coilPreset: [{ supplierId: form.supplierId, coilNumber: '' }]
      })
    ],
    packages: [],
    address: '',
    city: '',
    po: '',
    salesman: '',
    shipVia: ''
  }

  rollformingStore.set(state => ({ orders: [order, ...state.orders] }))
  return number
}

/* -- coil assignment ----------------------------------------------------------------------------- */

/** One Supplier and one Coil Number across every unit picked, and the selection is spent. */
export const assignUnits = (
  orderId: number,
  units: { lineId: number; coilIdx: number }[],
  supplierId: number | null,
  coilNumber: string
) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order =>
      order.id !== orderId
        ? order
        : {
            ...order,
            lineItems: order.lineItems.map(item => {
              const indexes = units
                .filter(unit => unit.lineId === item.id)
                .map(unit => unit.coilIdx)
              if (!indexes.length) return item

              return {
                ...item,
                coils: item.coils.map((coil, index) =>
                  indexes.includes(index) ? { ...coil, supplierId, coilNumber } : coil
                )
              }
            })
          }
    ),
    selectedCoilCtx: null
  }))

/**
 * A unit either rolls off a coil that exists or waits for one to be slit, and the two are exclusive:
 * sending it to the Slit Line drops whatever coil it had been given, because that coil is not the one
 * it will roll off. Stock units have no slit decision — they are not being rolled.
 */
export const toggleNeedsSlit = (orderId: number, lineId: number, coilIdx: number) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order =>
      order.id !== orderId
        ? order
        : {
            ...order,
            lineItems: order.lineItems.map(item =>
              item.id !== lineId
                ? item
                : {
                    ...item,
                    coils: item.coils.map((coil, index) => {
                      if (index !== coilIdx || coil.stock) return coil
                      const needsSlit = !coil.needsSlit
                      return {
                        ...coil,
                        needsSlit,
                        slitDone: false,
                        supplierId: needsSlit ? null : coil.supplierId,
                        coilNumber: needsSlit ? '' : coil.coilNumber
                      }
                    })
                  }
            )
          }
    )
  }))

/** Remembered rather than only written to the clipboard: the paste button is the reliable path. */
export const copyCoilNumber = (coilNumber: string) => {
  if (!coilNumber) return
  void navigator.clipboard?.writeText(coilNumber).catch(() => {})
  rollformingStore.set({ copiedCoilNumber: coilNumber })
  showToast(`Copied Coil Number ${coilNumber}`)
}

/* -- notes ------------------------------------------------------------------------------------- */

const patchNotes = (ctx: NoteCtx, fn: (notes: Note[]) => Note[]) =>
  rollformingStore.set(state => ({
    orders: state.orders.map(order => {
      if (order.id !== ctx.orderId) return order
      if (ctx.lineId == null) return { ...order, notes: fn(order.notes) }

      return {
        ...order,
        lineItems: order.lineItems.map(item =>
          item.id === ctx.lineId ? { ...item, notes: fn(item.notes ?? []) } : item
        )
      }
    })
  }))

export const addNote = (ctx: NoteCtx, note: Note) => patchNotes(ctx, notes => [...notes, note])

export const acknowledgeNote = (ctx: NoteCtx, noteId: number) =>
  patchNotes(ctx, notes =>
    notes.map(note => (note.id === noteId ? { ...note, dealt: true } : note))
  )

export const setScheduledDay = (scheduledDay: string) => rollformingStore.set({ scheduledDay })

export const setCoilsFolder = (expandedCoilsFolder: string) =>
  rollformingStore.set({ expandedCoilsFolder })
