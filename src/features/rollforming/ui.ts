import type { Alert, Confirm } from '@/components/shell/modal'
import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'

import { rollformingStore } from './store'

import type { AssignCtx } from './components/assign'
import type { CoilPickCtx } from './components/coil-pick'
import type { PadCtx } from './components/keypad'
import type { LotPickCtx } from './components/lot-pick'
import type { NoteCtx } from './components/note-modal'

export type RollformingUi = {
  note: NoteCtx | null
  mreq: boolean
  assign: AssignCtx | null
  coilPick: CoilPickCtx | null
  lotPick: LotPickCtx | null
  pad: PadCtx | null
  pkg: number | null
  seePkg: number | null
  confirm: Confirm
  alert: Alert
  toast: { message: string; type: ToastType; shown: boolean }
}

/**
 * What is open, asked or being said. The same split Trim makes, and for the same reason: a row nested
 * four levels down opens a modal by calling a function rather than by a callback threaded through
 * every component between it and the page.
 */
export const rollformingUi = createStore<RollformingUi>({
  note: null,
  mreq: false,
  assign: null,
  coilPick: null,
  lotPick: null,
  pad: null,
  pkg: null,
  seePkg: null,
  confirm: null,
  alert: null,
  toast: { message: '', type: 'success', shown: false }
})

export const openNotes = (note: NoteCtx) => rollformingUi.set({ note })
export const closeNotes = () => rollformingUi.set({ note: null })

export const openMaterialRequest = () => rollformingUi.set({ mreq: true })
export const closeMaterialRequest = () => rollformingUi.set({ mreq: false })

export const openAssign = (assign: AssignCtx) => rollformingUi.set({ assign })
export const closeAssign = () => rollformingUi.set({ assign: null })

/** The toolbar's two buttons assign whatever units are ticked; only the title differs. */
export const openBulkAssign = (orderId: number, asCutlist: boolean) => {
  const ctx = rollformingStore.get().selectedCoilCtx
  if (!ctx || ctx.orderId !== orderId) return

  openAssign({
    orderId,
    units: ctx.units.map(unit => {
      const [lineId, coilIdx] = unit.split(':')
      return { lineId: Number(lineId), coilIdx: Number(coilIdx) }
    }),
    asCutlist
  })
}

export const openCoilPick = (coilPick: CoilPickCtx) => rollformingUi.set({ coilPick })
export const closeCoilPick = () => rollformingUi.set({ coilPick: null })

export const openLotPick = (lotPick: LotPickCtx) => rollformingUi.set({ lotPick })
export const closeLotPick = () => rollformingUi.set({ lotPick: null })

export const openPad = (pad: PadCtx) => rollformingUi.set({ pad })
export const closePad = () => rollformingUi.set({ pad: null })

export const openPackage = (pkg: number) => rollformingUi.set({ pkg })
export const closePackage = () => rollformingUi.set({ pkg: null })

export const openSeePackages = (seePkg: number) => rollformingUi.set({ seePkg })
export const closeSeePackages = () => rollformingUi.set({ seePkg: null })

export const askConfirm = (
  title: string,
  desc: string,
  onOk: () => void,
  ok?: string,
  cancel?: string
) => rollformingUi.set({ confirm: { title, desc, onOk, ok, cancel } })

export const closeConfirm = () => rollformingUi.set({ confirm: null })

export const askAlert = (title: string, desc: string) =>
  rollformingUi.set({ alert: { title, desc } })
export const closeAlert = () => rollformingUi.set({ alert: null })

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const showToast = (message: string, type: ToastType = 'success') => {
  rollformingUi.set({ toast: { message, type, shown: true } })
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(
    () => rollformingUi.set(state => ({ toast: { ...state.toast, shown: false } })),
    2600
  )
}
