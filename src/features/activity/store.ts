import { createStore } from '@/store/create-store'

export type Event = {
  id: number
  actor: string
  dept: string
  type: string
  action: string
  targets: string[]
  day: 'today' | 'yesterday'
  minsAgo?: number
  fixedTime?: string
}

export type ActivityState = {
  paused: boolean
  search: string
  deptFilter: string
  typeFilter: string
  events: Event[]
  /** The newest live row, which flashes once. Any other action clears it, as a re-render does there. */
  flashId: number | null
}

export const DEPTS_FILTER = ['All', 'Trim', 'Rollforming', 'Accessories', 'Shipping']

/** A row deep-links to the department's working tab, not to its landing view. */
export const DEPT_HREF: Record<string, string> = {
  Trim: '/trim?view=production',
  Rollforming: '/rollforming?view=production',
  Accessories: '/accessories?view=packaging',
  Shipping: '/shipping?view=scheduled'
}

export const TYPES_FILTER = ['All types', 'Status', 'Release', 'EBMS', 'Shipment', 'Coil', 'Login']

export const TYPE_CLASS: Record<string, string> = {
  Status: 'status',
  Release: 'release',
  EBMS: 'ebms',
  Shipment: 'shipment',
  Coil: 'coil',
  Login: 'login'
}

const ACTORS = [
  { name: 'John Enns', dept: 'Trim' },
  { name: 'Hannah Weir', dept: 'Trim' },
  { name: 'Marcus Reid', dept: 'Trim' },
  { name: 'Dana Cole', dept: 'Rollforming' },
  { name: 'Priya Nair', dept: 'Accessories' },
  { name: 'Sam Okafor', dept: 'Accessories' },
  { name: 'Wade Ferris', dept: 'Shipping' },
  { name: 'Ray Dobbins', dept: 'Shipping' }
]

const ORDER_POOL = [
  '338001',
  '338002',
  '338004',
  '338005',
  '338007',
  '338009',
  '338010',
  '338012',
  '338301'
]

const COIL_POOL = [
  '3781012',
  '3781013',
  '3782201',
  '3782977',
  '3782978',
  '3782879',
  '3790455',
  '3790461',
  '3785540'
]

const MACHINE_POOL = ['V1', 'V2', 'Rollformer', 'Press Brake', 'Caps']

/** Which departments plausibly generate each event type — it keeps the live simulation believable. */
const DEPTS_FOR_TYPE: Record<string, string[]> = {
  Status: ['Trim', 'Rollforming', 'Accessories'],
  Release: ['Trim', 'Rollforming', 'Accessories'],
  EBMS: ['Trim', 'Rollforming', 'Accessories'],
  Shipment: ['Shipping'],
  Coil: ['Trim', 'Rollforming'],
  Login: ['Trim', 'Rollforming', 'Accessories', 'Shipping']
}

const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)] as T
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))

const TEMPLATES: { type: string; make: () => { action: string; targets: string[] } }[] = [
  {
    type: 'Status',
    make: () => {
      const order = pick(ORDER_POOL)
      return { action: `marked order ${order} wrapped`, targets: [order] }
    }
  },
  {
    type: 'Status',
    make: () => {
      const order = pick(ORDER_POOL)
      return { action: `moved order ${order} to In Progress`, targets: [order] }
    }
  },
  {
    type: 'Status',
    make: () => {
      const order = pick(ORDER_POOL)
      return { action: `flagged order ${order} as overdue`, targets: [order] }
    }
  },
  {
    type: 'Status',
    make: () => {
      const order = pick(ORDER_POOL)
      const machine = pick(MACHINE_POOL)
      return {
        action: `completed bendlist on ${machine} for order ${order}`,
        targets: [order, machine]
      }
    }
  },
  {
    type: 'Release',
    make: () => ({ action: `released ${randInt(2, 5)} cutlists to Slinet`, targets: [] })
  },
  {
    type: 'Release',
    make: () => {
      const order = pick(ORDER_POOL)
      return { action: `released order ${order} to production`, targets: [order] }
    }
  },
  {
    type: 'EBMS',
    make: () => {
      const coil = pick(COIL_POOL)
      return { action: `pushed ${randInt(120, 320)} LF to EBMS for coil ${coil}`, targets: [coil] }
    }
  },
  {
    type: 'EBMS',
    make: () => {
      const order = pick(ORDER_POOL)
      return { action: `completed order ${order} → C_MFG batch`, targets: [order] }
    }
  },
  {
    type: 'EBMS',
    make: () => {
      const coil = pick(COIL_POOL)
      return { action: `synced coil ${coil} from EBMS`, targets: [coil] }
    }
  },
  {
    type: 'Shipment',
    make: () => ({
      action: `dispatched Truck ${randInt(1, 3)} (${randInt(3, 7)} stops)`,
      targets: []
    })
  },
  {
    type: 'Shipment',
    make: () => {
      const order = pick(ORDER_POOL)
      return { action: `marked stop for order ${order} delivered`, targets: [order] }
    }
  },
  {
    type: 'Shipment',
    make: () => ({ action: `checked off Load ${randInt(1, 3)} → En Route`, targets: [] })
  },
  {
    type: 'Shipment',
    make: () => {
      const label = `01-${pick(ORDER_POOL)}-${randInt(1, 3)}`
      return { action: `scanned package ${label}`, targets: [label] }
    }
  },
  {
    type: 'Coil',
    make: () => {
      const coil = pick(COIL_POOL)
      return { action: `adjusted coil ${coil} inventory`, targets: [coil] }
    }
  },
  {
    type: 'Coil',
    make: () => {
      const coil = pick(COIL_POOL)
      return { action: `logged coil ${coil} into Slinet`, targets: [coil] }
    }
  },
  {
    type: 'Coil',
    make: () => {
      const coil = pick(COIL_POOL)
      return { action: `flagged coil ${coil} partial`, targets: [coil] }
    }
  },
  { type: 'Login', make: () => ({ action: 'signed in', targets: [] }) },
  { type: 'Login', make: () => ({ action: 'signed out', targets: [] }) }
]

/** Sixteen historical events across today and yesterday, every department and every type. */
export const activityStore = createStore<ActivityState>({
  paused: false,
  search: '',
  deptFilter: 'All',
  typeFilter: 'All types',
  flashId: null,
  events: [
    {
      id: 1,
      actor: 'Hannah Weir',
      dept: 'Trim',
      type: 'Status',
      action: 'marked order 338009 wrapped',
      targets: ['338009'],
      day: 'today',
      minsAgo: 3
    },
    {
      id: 2,
      actor: 'Marcus Reid',
      dept: 'Trim',
      type: 'EBMS',
      action: 'pushed 214 LF to EBMS for coil 3781012',
      targets: ['3781012'],
      day: 'today',
      minsAgo: 9
    },
    {
      id: 3,
      actor: 'Wade Ferris',
      dept: 'Shipping',
      type: 'Shipment',
      action: 'dispatched Truck 2 (5 stops)',
      targets: [],
      day: 'today',
      minsAgo: 16
    },
    {
      id: 4,
      actor: 'Dana Cole',
      dept: 'Rollforming',
      type: 'Coil',
      action: 'logged coil 3790455 into Slinet',
      targets: ['3790455'],
      day: 'today',
      minsAgo: 24
    },
    {
      id: 5,
      actor: 'John Enns',
      dept: 'Trim',
      type: 'Release',
      action: 'released 3 cutlists to Slinet',
      targets: [],
      day: 'today',
      minsAgo: 38
    },
    {
      id: 6,
      actor: 'Sam Okafor',
      dept: 'Accessories',
      type: 'Status',
      action: 'moved order 338012 to In Progress',
      targets: ['338012'],
      day: 'today',
      minsAgo: 52
    },
    {
      id: 7,
      actor: 'Ray Dobbins',
      dept: 'Shipping',
      type: 'Shipment',
      action: 'scanned package 01-338009-1',
      targets: ['01-338009-1'],
      day: 'today',
      minsAgo: 67
    },
    {
      id: 8,
      actor: 'Hannah Weir',
      dept: 'Trim',
      type: 'Login',
      action: 'signed in',
      targets: [],
      day: 'today',
      minsAgo: 95
    },
    {
      id: 9,
      actor: 'Marcus Reid',
      dept: 'Trim',
      type: 'EBMS',
      action: 'completed order 338005 → C_MFG batch',
      targets: ['338005'],
      day: 'today',
      minsAgo: 131
    },
    {
      id: 10,
      actor: 'Priya Nair',
      dept: 'Accessories',
      type: 'Status',
      action: 'flagged order 338301 as overdue',
      targets: ['338301'],
      day: 'today',
      minsAgo: 150
    },
    {
      id: 11,
      actor: 'John Enns',
      dept: 'Trim',
      type: 'Status',
      action: 'marked order 338002 wrapped',
      targets: ['338002'],
      day: 'yesterday',
      fixedTime: '5:42 PM'
    },
    {
      id: 12,
      actor: 'Wade Ferris',
      dept: 'Shipping',
      type: 'Shipment',
      action: 'checked off Load 1 → En Route',
      targets: [],
      day: 'yesterday',
      fixedTime: '4:20 PM'
    },
    {
      id: 13,
      actor: 'Dana Cole',
      dept: 'Rollforming',
      type: 'Coil',
      action: 'flagged coil 3782978 partial',
      targets: ['3782978'],
      day: 'yesterday',
      fixedTime: '3:05 PM'
    },
    {
      id: 14,
      actor: 'Dana Cole',
      dept: 'Rollforming',
      type: 'Release',
      action: 'released order 338010 to production',
      targets: ['338010'],
      day: 'yesterday',
      fixedTime: '10:14 AM'
    },
    {
      id: 15,
      actor: 'Hannah Weir',
      dept: 'Trim',
      type: 'EBMS',
      action: 'synced coil 3781013 from EBMS',
      targets: ['3781013'],
      day: 'yesterday',
      fixedTime: '9:30 AM'
    },
    {
      id: 16,
      actor: 'Marcus Reid',
      dept: 'Trim',
      type: 'Login',
      action: 'signed in',
      targets: [],
      day: 'yesterday',
      fixedTime: '8:58 AM'
    }
  ]
})

let seq = 16

export const LIVE_INTERVAL_MS = 4500

/** The feed keeps 60 rows; past that the oldest fall off the end. */
export const addLiveEvent = () => {
  if (activityStore.get().paused) return

  seq++
  const template = pick(TEMPLATES)
  const pool = ACTORS.filter(actor => DEPTS_FOR_TYPE[template.type]?.includes(actor.dept))
  const actor = pick(pool.length ? pool : ACTORS)
  const { action, targets } = template.make()

  activityStore.set(state => ({
    flashId: seq,
    events: [
      {
        id: seq,
        actor: actor.name,
        dept: actor.dept,
        type: template.type,
        action,
        targets,
        day: 'today' as const,
        minsAgo: 0
      },
      ...state.events
    ].slice(0, 60)
  }))
}

// every other action clears the flash, because in the prototype the next render consumes it
export const setSearch = (search: string) => activityStore.set({ search, flashId: null })
export const setDeptFilter = (deptFilter: string) =>
  activityStore.set({ deptFilter, flashId: null })
export const setTypeFilter = (typeFilter: string) =>
  activityStore.set({ typeFilter, flashId: null })
export const togglePause = () =>
  activityStore.set(state => ({ paused: !state.paused, flashId: null }))

export const relLabel = (event: Event) => {
  if (event.day === 'yesterday') return `Yesterday ${event.fixedTime}`
  if ((event.minsAgo ?? 0) < 1) return 'just now'
  if ((event.minsAgo ?? 0) < 60) return `${event.minsAgo}m`
  return `${Math.floor((event.minsAgo ?? 0) / 60)}h`
}

export const matchesFilters = (event: Event, state: ActivityState) => {
  if (state.deptFilter !== 'All' && event.dept !== state.deptFilter) return false
  if (state.typeFilter !== 'All types' && event.type !== state.typeFilter) return false

  const query = state.search.trim().toLowerCase()
  if (!query) return true

  const hay = `${event.actor} ${event.action} ${event.dept} ${event.type} ${event.targets.join(' ')}`
  return hay.toLowerCase().includes(query)
}

export const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
