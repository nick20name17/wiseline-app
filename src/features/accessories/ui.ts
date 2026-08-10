import type { Alert, Confirm } from '@/components/shell/modal'
import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'

import { unscheduledOrders } from './selectors'
import { accessoriesStore } from './store'

import type { ScheduleCtx } from './components/calendar-modal'
import type { NoteCtx } from './components/note-modal'

export type AccessoriesUi = {
  note: NoteCtx | null
  schedule: ScheduleCtx | null
  confirm: Confirm
  alert: Alert
  toast: { message: string; type: ToastType; shown: boolean }
}

/** What is open, asked or being said — the same split Trim and Rollforming make. */
export const accessoriesUi = createStore<AccessoriesUi>({
  note: null,
  schedule: null,
  confirm: null,
  alert: null,
  toast: { message: '', type: 'success', shown: false }
})

export const openNotes = (note: NoteCtx) => accessoriesUi.set({ note })
export const closeNotes = () => accessoriesUi.set({ note: null })

export const openSchedule = (schedule: ScheduleCtx) => accessoriesUi.set({ schedule })
export const closeSchedule = () => accessoriesUi.set({ schedule: null })

/** A split order cannot be scheduled whole, so the toolbar's button skips one that is already split. */
export const openScheduleEntire = () => {
  const state = accessoriesStore.get()
  const orderIds = state.selectedOrderIds.filter(id =>
    unscheduledOrders(state.orders).some(order => order.id === id && !order.isSplit)
  )
  if (orderIds.length) openSchedule({ mode: 'entire', orderIds })
}

export const openScheduleSplit = (orderId: number) => {
  const state = accessoriesStore.get()
  if (state.splitOrderId !== orderId || !state.selectedLineIds.length) return
  openSchedule({ mode: 'split', orderId, lineIds: [...state.selectedLineIds] })
}

export const openReschedule = (orderId: number) =>
  openSchedule({ mode: 'reschedule', orderId })

export const askConfirm = (
  title: string,
  desc: string,
  onOk: () => void,
  ok?: string,
  cancel?: string
) => accessoriesUi.set({ confirm: { title, desc, onOk, ok, cancel } })

export const closeConfirm = () => accessoriesUi.set({ confirm: null })

export const askAlert = (title: string, desc: string) =>
  accessoriesUi.set({ alert: { title, desc } })
export const closeAlert = () => accessoriesUi.set({ alert: null })

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const showToast = (message: string, type: ToastType = 'success') => {
  accessoriesUi.set({ toast: { message, type, shown: true } })
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(
    () => accessoriesUi.set(state => ({ toast: { ...state.toast, shown: false } })),
    2600
  )
}
