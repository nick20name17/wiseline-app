import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'

import { schedGridOrders, unscheduledOrders } from './selectors'
import { shippingStore } from './store'

import type { CalCtx } from './components/calendar-modal'
import type { ScheduleCtx } from './components/schedule-modal'
import type { NewPkgCtx } from './components/new-package'
import type { LoadTruckCtx } from './components/load-truck'
import type { TruckCtx } from './components/sched-truck'

export type ShippingUi = {
  /** The order whose note thread is open. */
  note: number | null
  truckNotes: boolean
  completed: boolean
  /** The order shown on its own map. */
  mapDetail: number | null
  schedTruck: TruckCtx | null
  loadTruck: LoadTruckCtx | null
  /** The load whose Details / Route detail is open. */
  load: number | null
  schedule: ScheduleCtx | null
  newPkg: NewPkgCtx | null
  /** The order whose Add-qty is being typed on the keypad. */
  newPkgKp: number | null
  cal: CalCtx | null
  /** Bumped on every open, so the picker's mount site can key a fresh month grid off it. */
  calSeq: number
  toast: { message: string; type: ToastType; shown: boolean }
}

/**
 * What is open and what is being said. Shipping has no confirm or alert overlay — the prototype's
 * dispatch screens ask nothing and warn in the toast instead.
 */
export const shippingUi = createStore<ShippingUi>({
  note: null,
  truckNotes: false,
  completed: false,
  mapDetail: null,
  schedTruck: null,
  loadTruck: null,
  load: null,
  schedule: null,
  newPkg: null,
  newPkgKp: null,
  cal: null,
  calSeq: 0,
  toast: { message: '', type: 'success', shown: false }
})

export const openOrderNotes = (note: number) => shippingUi.set({ note })
export const closeOrderNotes = () => shippingUi.set({ note: null })

export const openCompleted = () => shippingUi.set({ completed: true })
export const closeCompleted = () => shippingUi.set({ completed: false })

export const openMapDetail = (mapDetail: number) => shippingUi.set({ mapDetail })
export const closeMapDetail = () => shippingUi.set({ mapDetail: null })

export const openTruckNotes = () => shippingUi.set({ truckNotes: true })
export const closeTruckNotes = () => shippingUi.set({ truckNotes: false })

/** Opening a truck's detail focuses the board on it and starts from a clean selection. */
export const openSchedTruck = (schedTruck: TruckCtx) => {
  shippingStore.set({ expTruck: schedTruck.truckId, loadFilter: null, selScheduled: [] })
  shippingUi.set({ schedTruck })
}

export const closeSchedTruck = () => shippingUi.set({ schedTruck: null })

/** The Loading board's truck detail always starts By Truck, as the prototype's does. */
export const openLoadTruck = (loadTruck: LoadTruckCtx) => {
  shippingStore.set({ loadingSubTab: 'truck' })
  shippingUi.set({ loadTruck })
}

export const closeLoadTruck = () => shippingUi.set({ loadTruck: null })

export const openLoadModal = (load: number) => shippingUi.set({ load })
export const closeLoadModal = () => shippingUi.set({ load: null })

export const openSchedule = (schedule: ScheduleCtx) => shippingUi.set({ schedule })
export const closeSchedule = () => shippingUi.set({ schedule: null })

/** The toolbar's Schedule button takes whatever is still ticked *and* still unscheduled. */
export const openScheduleForSelection = () => {
  const state = shippingStore.get()
  const orderIds = state.selUnscheduled.filter(id =>
    unscheduledOrders(state.orders).some(order => order.id === id)
  )
  if (orderIds.length) openSchedule({ orderIds })
}

/** Every ticked row starts at one package to add — the common case is one, and nought means no row. */
export const openNewPackage = (truckId: number, activeDay: string) => {
  const state = shippingStore.get()
  const rows = schedGridOrders(truckId, activeDay, state)
  const orderIds = state.selScheduled.filter(id => rows.some(order => order.id === id))
  if (!orderIds.length) return

  shippingUi.set({
    newPkg: { orderIds, qty: Object.fromEntries(orderIds.map(id => [id, 1])) }
  })
}

export const closeNewPackage = () => shippingUi.set({ newPkg: null })

export const openNewPkgKeypad = (orderId: number) => shippingUi.set({ newPkgKp: orderId })
export const closeNewPkgKeypad = () => shippingUi.set({ newPkgKp: null })

/** Ninety-nine is the keypad's ceiling; a run bigger than that is a different conversation. */
export const setNewPkgQty = (orderId: number, qty: number) =>
  shippingUi.set(state =>
    state.newPkg
      ? {
          newPkg: {
            ...state.newPkg,
            qty: { ...state.newPkg.qty, [orderId]: Math.max(0, Math.min(99, qty)) }
          },
          newPkgKp: null
        }
      : {}
  )

export const openCalendar = (cal: CalCtx) =>
  shippingUi.set(state => ({ cal, calSeq: state.calSeq + 1 }))
export const closeCalendar = () => shippingUi.set({ cal: null })

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const showToast = (message: string, type: ToastType = 'success') => {
  shippingUi.set({ toast: { message, type, shown: true } })
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(
    () => shippingUi.set(state => ({ toast: { ...state.toast, shown: false } })),
    2600
  )
}
