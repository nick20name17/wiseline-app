import { createStore } from '@/store/create-store'

export type Writeback = {
  id: number
  time: string
  type: string
  ref: string
  payload: string
  status: string
}

export type EbmsState = {
  wbFilter: string
  writebacks: Writeback[]
}

export const TYPE_META: Record<string, string> = {
  Manufacturing: 'green',
  'Coil LF': 'teal',
  'Stock Mfg': 'amber'
}

export const STATUS_META: Record<string, string> = {
  Synced: 'green',
  Pending: 'amber',
  Failed: 'red'
}

export const WB_FILTERS = ['All', 'Manufacturing', 'Coil LF', 'Stock Mfg', 'Failed']

/** A day of write-backs: the canonical C_MFG path plus the two the spec adds. */
export const ebmsStore = createStore<EbmsState>({
  wbFilter: 'All',
  writebacks: [
    {
      id: 1,
      time: '7:58 AM',
      type: 'Manufacturing',
      ref: '338001',
      payload: '40 pcs → C_MFG',
      status: 'Synced'
    },
    {
      id: 2,
      time: '8:04 AM',
      type: 'Coil LF',
      ref: '3781012',
      payload: 'coil 3781012 → 214 LF',
      status: 'Synced'
    },
    {
      id: 3,
      time: '8:31 AM',
      type: 'Manufacturing',
      ref: '338004',
      payload: '18 pcs → C_MFG',
      status: 'Synced'
    },
    {
      id: 4,
      time: '8:49 AM',
      type: 'Stock Mfg',
      ref: 'TRC8262',
      payload: '25 pcs → C_MFG (stock)',
      status: 'Synced'
    },
    {
      id: 5,
      time: '9:12 AM',
      type: 'Coil LF',
      ref: '3782978',
      payload: 'coil 3782978 → 928 LF',
      status: 'Synced'
    },
    {
      id: 6,
      time: '9:37 AM',
      type: 'Manufacturing',
      ref: '338007',
      payload: '32 pcs → C_MFG',
      status: 'Failed'
    },
    {
      id: 7,
      time: '10:05 AM',
      type: 'Stock Mfg',
      ref: 'CB4826W',
      payload: '50 pcs → C_MFG (stock)',
      status: 'Synced'
    },
    {
      id: 8,
      time: '10:22 AM',
      type: 'Manufacturing',
      ref: '338010',
      payload: '12 pcs → C_MFG',
      status: 'Synced'
    },
    {
      id: 9,
      time: '10:58 AM',
      type: 'Coil LF',
      ref: '3790455',
      payload: 'coil 3790455 → 3010 LF',
      status: 'Pending'
    },
    {
      id: 10,
      time: '11:34 AM',
      type: 'Manufacturing',
      ref: '338012',
      payload: '27 pcs → C_MFG',
      status: 'Synced'
    },
    {
      id: 11,
      time: '12:10 PM',
      type: 'Stock Mfg',
      ref: 'CB4826R',
      payload: '15 pcs → C_MFG (stock)',
      status: 'Pending'
    },
    {
      id: 12,
      time: '12:47 PM',
      type: 'Manufacturing',
      ref: '338301',
      payload: '9 pcs → C_MFG',
      status: 'Synced'
    }
  ]
})

export const setWbFilter = (wbFilter: string) => ebmsStore.set({ wbFilter })

export const retryWriteback = (id: number) =>
  ebmsStore.set(state => ({
    writebacks: state.writebacks.map(row => (row.id === id ? { ...row, status: 'Synced' } : row))
  }))

/** Failed is a status, the rest are types — one strip of chips filtering on two different fields. */
export const matchesWbFilter = (row: Writeback, filter: string) => {
  if (filter === 'All') return true
  if (filter === 'Failed') return row.status === 'Failed'
  return row.type === filter
}

export const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
