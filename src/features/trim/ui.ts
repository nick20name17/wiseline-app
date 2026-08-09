import type { Alert, Confirm } from '@/components/shell/modal'
import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'

import {
  assignLocation,
  removeLocation,
  remanListDone,
  setRemanFlag,
  setReviewed,
  unscheduleOrder
} from './store'

import type { BatchItem } from './selectors'
import type { PadCtx } from './components/keypads'
import type { NoteCtx } from './components/note-modal'
import type { ScheduleCtx } from './components/schedule-modal'

export type TrimUi = {
  schedule: ScheduleCtx | null
  note: NoteCtx | null
  pad: PadCtx | null
  /**
   * Which order is picking a location, and what the package it has staged weighs — the grid greys a
   * cell that *this* package would push over, so the weight has to travel with the request.
   */
  locPicker: { orderId: number; stagedWeight: number } | null
  packages: number | null
  /** The cutlist whose Slinet coils are open, held as its gauge/colour — that is what they match on. */
  cutlistCoils: string | null
  /** The lines behind one consolidated Total — the rows themselves, since that is all the modal reads. */
  cutlistTotal: BatchItem[] | null
  /** The day whose Machine Capacities report is open, and whether Allocated Stock is. */
  machineCap: string | null
  allocStock: boolean
  confirm: Confirm
  alert: Alert
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
  locPicker: null,
  packages: null,
  cutlistCoils: null,
  cutlistTotal: null,
  machineCap: null,
  allocStock: false,
  confirm: null,
  alert: null,
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

export const openLocPicker = (orderId: number, stagedWeight: number) =>
  trimUi.set({ locPicker: { orderId, stagedWeight } })
export const closeLocPicker = () => trimUi.set({ locPicker: null })

export const openPackages = (packages: number) => trimUi.set({ packages })
export const closePackages = () => trimUi.set({ packages: null })

export const openCutlistCoils = (cutlistCoils: string) => trimUi.set({ cutlistCoils })
export const closeCutlistCoils = () => trimUi.set({ cutlistCoils: null })

export const openCutlistTotal = (cutlistTotal: BatchItem[]) => trimUi.set({ cutlistTotal })
export const closeCutlistTotal = () => trimUi.set({ cutlistTotal: null })

export const openMachineCap = (machineCap: string) => trimUi.set({ machineCap })
export const closeMachineCap = () => trimUi.set({ machineCap: null })

export const openAllocStock = () => trimUi.set({ allocStock: true })
export const closeAllocStock = () => trimUi.set({ allocStock: false })

export const askAlert = (title: string, desc: string) => trimUi.set({ alert: { title, desc } })
export const closeAlert = () => trimUi.set({ alert: null })

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

/**
 * Picking a cell that already holds this order removes it instead — the grid is a toggle, not a list.
 *
 * N-087: an order that has printed packages must keep at least one location, so removing its last one
 * is refused outright rather than confirmed. There is nothing to weigh up: the packages are physically
 * somewhere, and the app has to be able to say where.
 */
export const pickLocation = (
  order: { id: number; locationIds?: number[]; packages?: { deleted?: boolean }[] },
  locationId: number,
  code: string
) => {
  if (!(order.locationIds ?? []).includes(locationId)) {
    assignLocation(order.id, locationId)
    return showToast(`Location ${code} assigned`)
  }

  const isLast = (order.locationIds ?? []).length <= 1
  const hasPackages = (order.packages ?? []).some(pkg => !pkg.deleted)

  if (isLast && hasPackages)
    return askAlert(
      'Location required',
      'An order with existing packages needs to have at least 1 location, please select a location to continue.'
    )

  askConfirm(
    'Remove location',
    'Are you sure you want to remove this location from this order?',
    () => {
      removeLocation(order.id, locationId)
      closeConfirm()
      showToast(`Location ${code} removed`)
    },
    'Yes, remove'
  )
}

/**
 * Reviewed goes on instantly and comes off only after a question.
 *
 * Switching it on is a claim the Manager is making and can retract; switching it off retracts one
 * other people may already be acting on, because a reviewed order is what the release list offers.
 */
export const requestToggleReviewed = (order: { id: number; order: string; reviewed: boolean }) => {
  if (!order.reviewed) return setReviewed(order.id, true)

  askConfirm(
    'Turn off Reviewed?',
    `Order ${order.order} will no longer be selectable for release.`,
    () => {
      setReviewed(order.id, false)
      closeConfirm()
    }
  )
}
