import type { Alert, Confirm } from '@/components/shell/modal'
import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'

import { locCurrentWeight, stagedWeight, unscheduledOrders } from './selectors'
import {
  accessoriesStore,
  completeOrder,
  deletePackage,
  finalizePackage,
  removeLocation
} from './store'

import type { ScheduleCtx } from './components/calendar-modal'
import type { NoteCtx } from './components/note-modal'

export type AccessoriesUi = {
  note: NoteCtx | null
  schedule: ScheduleCtx | null
  /** The order picking a location, and the order whose packages are listed. */
  locPicker: number | null
  packages: number | null
  confirm: Confirm
  alert: Alert
  toast: { message: string; type: ToastType; shown: boolean }
}

/** What is open, asked or being said — the same split Trim and Rollforming make. */
export const accessoriesUi = createStore<AccessoriesUi>({
  note: null,
  schedule: null,
  locPicker: null,
  packages: null,
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

export const openLocationPicker = (locPicker: number) => accessoriesUi.set({ locPicker })
export const closeLocationPicker = () => accessoriesUi.set({ locPicker: null })

export const openPackages = (packages: number) => accessoriesUi.set({ packages })
export const closePackages = () => accessoriesUi.set({ packages: null })

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

/**
 * Create & print, and the two questions it may ask on the way.
 *
 * Both are warnings rather than blocks — the operator on the floor can see the scale and the shelf, and
 * the app's limits are what the office asked for, not physics. Over the package's own Max Weight asks
 * first; over the *location's* limit asks second, and only about the location the order is actually
 * filling. A package with no location cannot be printed at all, because its label would say nowhere.
 */
export const createAndPrint = (orderId: number) => {
  const state = accessoriesStore.get()
  const order = state.orders.find(entry => entry.id === orderId)
  if (!order) return

  const staged = order.items.some(item => item.packaging > 0)
  if (!staged) return

  const weight = stagedWeight(order)

  const checkLocation = () => {
    const ids = order.locationIds ?? []
    if (!ids.length) {
      showToast('Select a location first')
      return
    }

    // the active location is the most recently picked one; the earlier ones are locked for this order
    const locationId = ids[ids.length - 1] as number
    const location = accessoriesStore.get().locations.find(entry => entry.id === locationId)

    const print = () => {
      const pkg = finalizePackage(orderId, location ? location.id : null, weight)
      if (pkg) showToast(`Printed label ${pkg.code} · ${weight.toFixed(2)} lb`)
    }

    if (location && locCurrentWeight(location) + weight > location.maxWeight)
      askConfirm(
        'Location over weight limit',
        `${location.code} will be over the weight limit, are you sure you want to continue?`,
        () => {
          closeConfirm()
          print()
        }
      )
    else print()
  }

  // 0 is not "nothing is over" but "no limit at all" — Settings › Machines can clear it
  if (order.maxPkgWeight > 0 && weight > order.maxPkgWeight)
    askConfirm(
      'Over weight package',
      `This package is ${weight.toFixed(2)} lb — over the ${order.maxPkgWeight} lb max per package. Continue with the over-weight package?`,
      () => {
        closeConfirm()
        checkLocation()
      }
    )
  else checkLocation()
}

/** Removing a location asks; removing the *last* one from an order that has packages refuses. */
export const requestRemoveLocation = (orderId: number, locationId: number) => {
  const state = accessoriesStore.get()
  const order = state.orders.find(entry => entry.id === orderId)
  const location = state.locations.find(entry => entry.id === locationId)
  if (!order || !location) return

  const isLast = (order.locationIds ?? []).length <= 1
  const hasPackages = order.packages.some(pkg => !pkg.deleted)

  if (isLast && hasPackages) {
    askAlert(
      'Location required',
      'An order with existing packages needs to have at least 1 location, please select a location to continue.'
    )
    return
  }

  askConfirm('Remove location', 'Are you sure you want to remove this location from this order?', () => {
    closeConfirm()
    removeLocation(orderId, locationId)
    showToast(`Location ${location.code} removed`)
  })
}

export const requestDeletePackage = (orderId: number, pkgId: number) =>
  askConfirm(
    'Delete package',
    'This will delete the package and return its pieces to Left To Package. The barcode becomes invalid — scanning it will show a deleted-package message.',
    () => {
      closeConfirm()
      const pkg = deletePackage(orderId, pkgId)
      if (pkg) showToast(`Package ${pkg.code} deleted`)
    }
  )

export const requestOrderComplete = (orderId: number) => {
  const order = accessoriesStore.get().orders.find(entry => entry.id === orderId)
  if (!order) return

  askConfirm(
    'Complete order',
    `This will move order ${order.orderNumber} to Completed Orders. Continue?`,
    () => {
      closeConfirm()
      completeOrder(orderId)
      showToast(`Order ${order.orderNumber} complete · moved to Completed Orders`)
    }
  )
}

export const reprintLabel = (code: string) => showToast(`Reprinted label ${code}`)
