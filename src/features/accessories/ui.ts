import type { Alert, Confirm } from '@/components/shell/modal'
import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'

import type { NoteCtx } from './components/note-modal'

export type AccessoriesUi = {
  note: NoteCtx | null
  confirm: Confirm
  alert: Alert
  toast: { message: string; type: ToastType; shown: boolean }
}

/** What is open, asked or being said — the same split Trim and Rollforming make. */
export const accessoriesUi = createStore<AccessoriesUi>({
  note: null,
  confirm: null,
  alert: null,
  toast: { message: '', type: 'success', shown: false }
})

export const openNotes = (note: NoteCtx) => accessoriesUi.set({ note })
export const closeNotes = () => accessoriesUi.set({ note: null })

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
