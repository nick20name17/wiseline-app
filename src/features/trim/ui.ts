import type { Confirm } from '@/components/shell/modal'
import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'

import { remanListDone, setRemanFlag, unscheduleOrder } from './store'

import type { PadCtx } from './components/keypads'
import type { NoteCtx } from './components/note-modal'
import type { ScheduleCtx } from './components/schedule-modal'

export type TrimUi = {
  schedule: ScheduleCtx | null
  note: NoteCtx | null
  pad: PadCtx | null
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
  note: null,
  pad: null,
  confirm: null,
  toast: { message: '', type: 'success', shown: false }
})

export const openNotes = (note: NoteCtx) => trimUi.set({ note })
export const closeNotes = () => trimUi.set({ note: null })

export const closePad = () => trimUi.set({ pad: null })

/** Stock is locked once the line is wrapped or the order is complete — say so rather than open a pad. */
export const openPad = (pad: PadCtx) => {
  if (pad.kind === 'stock' && pad.locked) return showToast('Stock is locked — line already wrapped')
  trimUi.set({ pad })
}

export const openSchedule = (schedule: ScheduleCtx) => trimUi.set({ schedule })
export const closeSchedule = () => trimUi.set({ schedule: null })

export const askConfirm = (
  title: string,
  desc: string,
  onOk: () => void,
  ok?: string,
  cancel?: string
) => trimUi.set({ confirm: { title, desc, onOk, ok, cancel } })

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

/** N-054 semantics again: No→Yes is silent, Yes→No asks — and answers with Yes / No, not Confirm. */
export const askRemanFlag = (id: string, flag: 'recut' | 'bent', toYes: boolean) => {
  if (toYes) {
    setRemanFlag(id, flag, true)
    return showToast(
      flag === 'recut'
        ? 'Recut complete → Remanufacture green in the Machine tab (Wrapping stays orange until Bent)'
        : 'Remanufacture bent → Remanufacture green in the Wrapping tab'
    )
  }

  askConfirm(
    `Mark this ${flag === 'recut' ? 'recut' : 'remanufacture'} as NOT completed?`,
    'Are you sure you want to mark this row as NOT completed?',
    () => {
      setRemanFlag(id, flag, false)
      closeConfirm()
    },
    'Yes',
    'No'
  )
}

/** #212: a reman list's Done is the same gate as a normal one, so it asks the same question. */
export const askRemanListDone = (id: string, which: 'slinet' | 'machine') =>
  askConfirm(
    `Mark this ${which === 'slinet' ? 'recut cutlist' : 'remanufacture bendlist'} done?`,
    which === 'slinet'
      ? 'Confirm that you have made all the necessary coil adjustments and that you are done with this cutlist.'
      : 'Confirm that you are done with this bendlist.',
    () => {
      remanListDone(id, which)
      closeConfirm()
      showToast(which === 'slinet' ? 'Recut cutlist closed' : 'Remanufacture bendlist closed')
    }
  )
