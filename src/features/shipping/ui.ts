import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'

import { unscheduledOrders } from './selectors'
import { shippingStore } from './store'

import type { CalCtx } from './components/calendar-modal'
import type { ScheduleCtx } from './components/schedule-modal'
import type { TruckCtx } from './components/sched-truck'

export type ShippingUi = {
  /** The order whose note thread is open. */
  note: number | null
  truckNotes: boolean
  schedTruck: TruckCtx | null
  schedule: ScheduleCtx | null
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
  schedTruck: null,
  schedule: null,
  cal: null,
  calSeq: 0,
  toast: { message: '', type: 'success', shown: false }
})

export const openOrderNotes = (note: number) => shippingUi.set({ note })
export const closeOrderNotes = () => shippingUi.set({ note: null })

export const openTruckNotes = () => shippingUi.set({ truckNotes: true })
export const closeTruckNotes = () => shippingUi.set({ truckNotes: false })

/** Opening a truck's detail focuses the board on it and starts from a clean selection. */
export const openSchedTruck = (schedTruck: TruckCtx) => {
  shippingStore.set({ expTruck: schedTruck.truckId, loadFilter: null, selScheduled: [] })
  shippingUi.set({ schedTruck })
}

export const closeSchedTruck = () => shippingUi.set({ schedTruck: null })

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
