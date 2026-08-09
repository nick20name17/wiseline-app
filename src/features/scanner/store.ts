import { createStore } from '@/store/create-store'
import { patchPackage } from '@/store/shared/shipping'

export type Package = {
  label: string
  dept: string
  order: string
  seq: number
  customer: string
  contents: string
  weight: number
  location: string
  status: string
  /** Tombstoned: the label still exists, and is rejected on sight. */
  deleted: boolean
}

export type LogEntry = {
  ts: string
  kind: 'ok' | 'deleted' | 'unknown'
  label: string
  pkg?: Package
}

export type ScannerState = {
  packages: Package[]
  log: LogEntry[]
}

export const DEPTS: Record<string, string> = {
  '01': 'Trim',
  '02': 'Rollforming',
  '03': 'Accessories'
}

/** Five packages, written out rather than dumped — this page's whole seed is the list below. */
export const scannerStore = createStore<ScannerState>({
  packages: [
    {
      label: '01-330618-01',
      dept: '01',
      order: '330618',
      seq: 1,
      customer: 'A.M.C.',
      contents: '25 × Rake Trim (26ga Barn Red)',
      weight: 2100,
      location: '206',
      status: 'loaded',
      deleted: false
    },
    {
      label: '01-330618-02',
      dept: '01',
      order: '330618',
      seq: 2,
      customer: 'A.M.C.',
      contents: '10 × Gable Trim (Stock)',
      weight: 2100,
      location: '206',
      status: 'wrapped',
      deleted: false
    },
    {
      label: '01-330630-01',
      dept: '01',
      order: '330630',
      seq: 1,
      customer: 'Port Dover Builders',
      contents: "18 × Drip Edge 10'",
      weight: 2600,
      location: '310',
      status: 'wrapped',
      deleted: false
    },
    {
      label: '02-330622-01',
      dept: '02',
      order: '330622',
      seq: 1,
      customer: 'Norfolk Roofing Co.',
      contents: '40 × Tuff Rib Panel (Charcoal)',
      weight: 3050,
      location: 'RF-12',
      status: 'wrapped',
      deleted: false
    },
    {
      label: '01-330633-02',
      dept: '01',
      order: '330633',
      seq: 2,
      customer: 'Waterford Sheet Metal',
      contents: '50 × Sidewall Flashing',
      weight: 0,
      location: '—',
      status: 'wrapped',
      deleted: true
    }
  ],
  log: []
})

/** Server-side style validation: a tombstoned label is a rejection, not a miss. */
export const validate = (raw: string) => {
  const label = raw.trim().toUpperCase()
  if (!label) return null

  const pkg = scannerStore.get().packages.find(current => current.label === label)
  if (!pkg) return { kind: 'unknown' as const, label }
  if (pkg.deleted) return { kind: 'deleted' as const, label, pkg }
  return { kind: 'ok' as const, label, pkg }
}

/** A second scan of an already-loaded package is the scan-off, which delivers it. */
export const doScan = (raw: string) => {
  let result = validate(raw)
  if (!result) return

  if (result.kind === 'ok' && result.pkg.status === 'loaded') {
    scannerStore.set(state => ({
      packages: state.packages.map(pkg =>
        pkg.label === result?.label ? { ...pkg, status: 'delivered' } : pkg
      )
    }))
    patchPackage(result.label, { loaded: true, delivered: true })
    const updated = scannerStore.get().packages.find(pkg => pkg.label === result?.label)
    result = { ...result, pkg: updated as Package }
  }

  scannerStore.set(state => ({
    log: [
      {
        ts: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        ...result
      },
      ...state.log
    ].slice(0, 8)
  }))
}
