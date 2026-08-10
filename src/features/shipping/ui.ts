import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'

export type ShippingUi = {
  /** The order whose note thread is open. */
  note: number | null
  truckNotes: boolean
  toast: { message: string; type: ToastType; shown: boolean }
}

/**
 * What is open and what is being said. Shipping has no confirm or alert overlay — the prototype's
 * dispatch screens ask nothing and warn in the toast instead.
 */
export const shippingUi = createStore<ShippingUi>({
  note: null,
  truckNotes: false,
  toast: { message: '', type: 'success', shown: false }
})

export const openOrderNotes = (note: number) => shippingUi.set({ note })
export const closeOrderNotes = () => shippingUi.set({ note: null })

export const openTruckNotes = () => shippingUi.set({ truckNotes: true })
export const closeTruckNotes = () => shippingUi.set({ truckNotes: false })

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const showToast = (message: string, type: ToastType = 'success') => {
  shippingUi.set({ toast: { message, type, shown: true } })
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(
    () => shippingUi.set(state => ({ toast: { ...state.toast, shown: false } })),
    2600
  )
}
