import type { ToastType } from '@/components/shell/use-toast'

import { createStore } from '@/store/create-store'
import { patchLoadStatus, patchOrderStatus, patchPackage, shipState } from '@/store/shared/shipping'

export type LoadPackage = {
  label: string
  order: string
  customer: string
  weight: number
  status: string
}

export type Load = {
  id: number
  unit: string
  date: string
  packages: LoadPackage[]
}

export type LoadingState = {
  loads: Load[]
}

/** Two loads, written out rather than dumped — this page's whole seed is the list below. */
export const loadingStore = createStore<LoadingState>({
  loads: [
    {
      id: 1,
      unit: 'Truck 104 · Load 1',
      date: '2026-07-16',
      packages: [
        {
          label: '01-330618-01',
          order: '330618',
          customer: 'A.M.C.',
          weight: 2100,
          status: 'loaded'
        },
        {
          label: '01-330618-02',
          order: '330618',
          customer: 'A.M.C.',
          weight: 2100,
          status: 'pending'
        },
        {
          label: '01-330630-01',
          order: '330630',
          customer: 'Port Dover Builders',
          weight: 2600,
          status: 'pending'
        },
        {
          label: '01-330630-02',
          order: '330630',
          customer: 'Port Dover Builders',
          weight: 2600,
          status: 'pending'
        }
      ]
    },
    {
      id: 2,
      unit: 'Truck 102 · Load 2',
      date: '2026-07-16',
      packages: [
        {
          label: '02-330622-01',
          order: '330622',
          customer: 'Norfolk Roofing Co.',
          weight: 3050,
          status: 'pending'
        },
        {
          label: '02-330622-02',
          order: '330622',
          customer: 'Norfolk Roofing Co.',
          weight: 3050,
          status: 'loaded'
        },
        {
          label: '01-330633-01',
          order: '330633',
          customer: 'Waterford Sheet Metal',
          weight: 1300,
          status: 'pending'
        }
      ]
    }
  ]
})

const loadKeyFromUnit = (unit: string) => {
  const match = /Truck (\d+) · Load (\d+)/.exec(unit)
  return match ? `truck${match[1]}-load${match[2]}` : null
}

const findPackage = (label: string) => {
  for (const load of loadingStore.get().loads) {
    const pkg = load.packages.find(current => current.label === label)
    if (pkg) return { load, pkg }
  }
  return null
}

const isDeletedBarcode = (label: string) => {
  const record = shipState.get().packages?.[label] as { deleted?: boolean } | undefined
  return !!record?.deleted
}

const orderAllLoaded = (orderNumber: string) =>
  loadingStore
    .get()
    .loads.flatMap(load => load.packages)
    .filter(pkg => pkg.order === orderNumber)
    .every(pkg => pkg.status === 'loaded')

const markLoaded = (loadId: number, label: string) => {
  loadingStore.set(state => ({
    loads: state.loads.map(load =>
      load.id !== loadId
        ? load
        : {
            ...load,
            packages: load.packages.map(pkg =>
              pkg.label === label ? { ...pkg, status: 'loaded' } : pkg
            )
          }
    )
  }))

  // this stamp is the event the warehouse location countdown starts from: the moment Shipping put the
  // order's last package on a truck
  patchPackage(label, { loaded: true, loadedAt: Date.now() })

  const load = loadingStore.get().loads.find(current => current.id === loadId)
  if (load) {
    const key = loadKeyFromUnit(load.unit)
    const loaded = load.packages.filter(pkg => pkg.status === 'loaded').length
    if (key)
      patchLoadStatus(
        key,
        load.packages.length > 0 && loaded === load.packages.length ? 'loaded' : 'loading'
      )
  }

  const orderNumber = label.split('-')[1]
  if (orderNumber && orderAllLoaded(orderNumber)) patchOrderStatus(orderNumber, 'loaded')
}

/** A tombstoned barcode is invalid whether or not this load still lists it — that is the whole point. */
export const doScan = (raw: string, toast: (message: string, type?: ToastType) => void) => {
  const label = raw.trim().toUpperCase()
  if (!label) return

  if (isDeletedBarcode(label)) {
    toast('This package has been deleted', 'error')
    return
  }

  const hit = findPackage(label)
  if (!hit) {
    toast('Unknown label', 'error')
    return
  }
  if (hit.pkg.status === 'loaded') {
    toast(`${label} is already loaded`, 'warning')
    return
  }

  markLoaded(hit.load.id, label)
  toast(`${label} loaded onto ${hit.load.unit}`)
}

/** Tombstones a barcode upstream, then scans it — the demo's way of showing a rejection. */
export const simDeletedScan = (toast: (message: string, type?: ToastType) => void) => {
  const label = '01-330640-03'
  const state = shipState.get()
  shipState.set({
    ...state,
    packages: { ...(state.packages ?? {}), [label]: { ...state.packages?.[label], deleted: true } }
  })
  doScan(label, toast)
}
