import { preferenceStore } from '@/lib/preferences'
import type { PersistedStore } from '@/lib/persisted-store'
import { useState, useSyncExternalStore, type MouseEvent, type PointerEvent } from 'react'
import * as z from 'zod/mini'

// How far in from a dialog's edge a press takes hold of it. Inside the dialog's own padding, so it
// never lands on a control; outside, a press would land on the backdrop and close it.
const EDGE = 8
// The least a dialog is dragged down to: its title and a line or two still read.
const MIN_WIDTH = 320
const MIN_HEIGHT = 160
// The page margin a centred dialog keeps around it, as its own classes do (`max-w-[calc(100%-2rem)]`).
const MARGIN = 32

// Either side may be left alone: a dialog only dragged wider keeps fitting its content's height.
const sizeSchema = z.object({ width: z.optional(z.number()), height: z.optional(z.number()) })

type Size = z.infer<typeof sizeSchema>
type Side = -1 | 0 | 1

const stores = new Map<string, PersistedStore<Size>>()

const storeOf = (key: string) => {
  let store = stores.get(key)
  if (!store) {
    store = preferenceStore(`dialog:${key}`, sizeSchema)
    stores.set(key, store)
  }
  return store
}

const sideOf = (at: number, start: number, end: number): Side =>
  at >= end - EDGE ? 1 : at <= start + EDGE ? -1 : 0

const edgesAt = (event: MouseEvent<HTMLElement>): { x: Side; y: Side; rect: DOMRect } => {
  const element = event.currentTarget
  const rect = element.getBoundingClientRect()
  const { clientX: x, clientY: y } = event
  // React bubbles a portalled popover's events up to the dialog (a date picker's calendar), and they
  // land wherever the popover is, often outside the dialog: only a press on the dialog itself counts.
  if (
    !element.contains(event.target as Node) ||
    x < rect.left ||
    x > rect.right ||
    y < rect.top ||
    y > rect.bottom
  )
    return { x: 0, y: 0, rect }
  return { x: sideOf(x, rect.left, rect.right), y: sideOf(y, rect.top, rect.bottom), rect }
}

const cursorOf = (x: Side, y: Side) =>
  x && y ? (x === y ? 'nwse-resize' : 'nesw-resize') : x ? 'ew-resize' : y ? 'ns-resize' : ''

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

/**
 * A centred dialog sized by dragging its edges and corners, as an EBMS window is (Kevin's notes of
 * 2026-11-02, A12). It stays centred, so both opposite edges move: the size changes by twice the
 * pointer's travel. The size is the user's, kept per dialog under `dialog:<key>`; a double-click on
 * an edge gives the dialog back its own size.
 */
export const useDialogSize = (key: string) => {
  const store = storeOf(key)
  const saved = useSyncExternalStore(store.subscribe, store.get)
  // The size while a drag is under way, written to the preference once it ends.
  const [dragged, setDragged] = useState<Size | null>(null)
  const size = dragged ?? saved

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (dragged) return
    const { x, y } = edgesAt(event)
    event.currentTarget.style.cursor = cursorOf(x, y)
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    const element = event.currentTarget
    const { x, y, rect } = edgesAt(event)
    if (!x && !y) return
    // No text selected along the way, and no focus moved to whatever is under the edge.
    event.preventDefault()
    element.setPointerCapture(event.pointerId)
    const start = { x: event.clientX, y: event.clientY }
    const from: Size = saved ?? {}
    let next = from

    const move = (moved: globalThis.PointerEvent) => {
      next = {
        ...next,
        ...(x && {
          width: Math.round(
            clamp(
              rect.width + 2 * x * (moved.clientX - start.x),
              MIN_WIDTH,
              window.innerWidth - MARGIN
            )
          )
        }),
        ...(y && {
          height: Math.round(
            clamp(
              rect.height + 2 * y * (moved.clientY - start.y),
              MIN_HEIGHT,
              window.innerHeight - MARGIN
            )
          )
        })
      }
      setDragged(next)
    }
    const end = () => {
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', end)
      element.removeEventListener('pointercancel', end)
      // A press with no travel, as the first of a double-click is, leaves the saved size alone.
      if (next !== from) store.set(next)
      setDragged(null)
    }
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', end)
    element.addEventListener('pointercancel', end)
  }

  const onDoubleClick = (event: MouseEvent<HTMLElement>) => {
    const { x, y } = edgesAt(event)
    if (x || y) store.set(null)
  }

  return {
    width: size?.width,
    height: size?.height,
    onPointerMove,
    onPointerDown,
    onDoubleClick
  }
}
