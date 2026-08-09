import type { Confirm } from '@/components/shell/modal'
import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'

import { unscheduleOrder } from './store'

import type { ScheduleCtx } from './components/schedule-modal'

export type TrimUi = {
  schedule: ScheduleCtx | null
  confirm: Confirm
  toast: { message: string; type: ToastType; shown: boolean }
}

/**
 * What is open, asked or being said — the board's chrome, kept beside its data rather than inside it.
 *
 * The prototype holds exactly this in module-level variables next to its render functions
 * (`scheduleCtx`, `confirmCb`, `toastTimer`), and every deeply nested row reaches them by calling a
 * function. Threading callbacks down instead would mean a prop on every component between the view
 * and the button, for state no view actually renders.
 */
export const trimUi = createStore<TrimUi>({
  schedule: null,
  confirm: null,
  toast: { message: '', type: 'success', shown: false }
})

export const openSchedule = (schedule: ScheduleCtx) => trimUi.set({ schedule })
export const closeSchedule = () => trimUi.set({ schedule: null })

export const askConfirm = (title: string, desc: string, onOk: () => void) =>
  trimUi.set({ confirm: { title, desc, onOk } })

export const closeConfirm = () => trimUi.set({ confirm: null })

let timer: ReturnType<typeof setTimeout> | null = null

export const showToast = (message: string, type: ToastType = 'success') => {
  trimUi.set({ toast: { message, type, shown: true } })
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => trimUi.set(state => ({ toast: { ...state.toast, shown: false } })), 2600)
}

/**
 * Unscheduling is asked about, not just done: it moves the order back to Unscheduled *and* throws
 * away the Manager's priority, review tick, machine choices and # From Stock.
 */
export const confirmUnschedule = (orderId: number, orderNo: string) =>
  askConfirm(
    `Unschedule order ${orderNo}?`,
    'Moves it back to Unscheduled and resets all Manager edits (Priority, Reviewed, machines, # From Stock).',
    () => {
      unscheduleOrder(orderId)
      closeConfirm()
      closeSchedule()
      showToast(`Order ${orderNo} unscheduled — Manager edits reset`)
    }
  )
