import type { ToastType } from '@/components/shell/use-toast'

import {
  loadRankOf,
  loadStatusOf,
  patchLoadStatus,
  patchOrderStatus,
  patchPackage
} from '@/store/shared/shipping'

import { driverStore } from './store'

/** This page drives exactly one load; its key is what Shipping files the route's sequence under. */
const ROUTE_KEY = 'truck104-load1'

const ORDER_DEPT: Record<string, string> = {
  '330618': '01',
  '330630': '01',
  '330622': '02',
  '330633': '01'
}

export const barcode = (order: string, seq: number) =>
  `${ORDER_DEPT[order] ?? '01'}-${order}-${String(seq).padStart(2, '0')}`

/**
 * The En Route gate: the load has to be fully Loaded — every package scanned at the Loading station —
 * before the driver can leave. It mirrors Shipping's own guard, and falls back to this route's stops
 * when no cross-page load status exists yet.
 */
export const startRoute = (toast: (message: string, type?: ToastType) => void) => {
  if (driverStore.get().started) return

  const shared = loadStatusOf(ROUTE_KEY)
  const loaded = shared
    ? loadRankOf(shared) >= loadRankOf('loaded')
    : driverStore.get().stops.every(stop => stop.status === 'loaded' || stop.status === 'delivered')

  if (!loaded) {
    toast('Load not fully loaded — scan all packages at the Loading station first', 'error')
    return
  }

  driverStore.set(state => ({
    started: true,
    stops: state.stops.map(stop => ({
      ...stop,
      status: stop.status === 'delivered' ? 'delivered' : 'shipping'
    }))
  }))

  for (const stop of driverStore.get().stops)
    if (stop.status !== 'delivered') patchOrderStatus(stop.order, 'shipping')
  patchLoadStatus(ROUTE_KEY, 'shipping')
  toast('Route started — drive safe')
}

/**
 * One tap scans one package off. The order rolls up to Delivered only once all of its packages are,
 * and the load only once all of its stops are.
 */
export const deliverStop = (id: number, toast: (message: string, type?: ToastType) => void) => {
  if (!driverStore.get().started) return

  const stop = driverStore.get().stops.find(current => current.id === id)
  if (!stop || stop.status === 'delivered') return

  const seq = stop.deliveredPkgs + 1

  driverStore.set(state => ({
    stops: state.stops.map(current => {
      if (current.id !== id) return current
      const delivered = Math.min(current.pkgs, current.deliveredPkgs + 1)
      return {
        ...current,
        deliveredPkgs: delivered,
        status: delivered >= current.pkgs ? 'delivered' : current.status
      }
    })
  }))

  patchPackage(barcode(stop.order, seq), { loaded: true, delivered: true })

  const updated = driverStore.get().stops.find(current => current.id === id)
  if (updated?.status === 'delivered') {
    patchOrderStatus(stop.order, 'delivered')
    toast(`Delivered ${stop.order} — all ${stop.pkgs} package(s) scanned off`)
  } else {
    toast(`Package ${seq} / ${stop.pkgs} scanned off — ${stop.order}`)
  }

  if (driverStore.get().stops.every(current => current.status === 'delivered'))
    patchLoadStatus(ROUTE_KEY, 'shipped')
}
