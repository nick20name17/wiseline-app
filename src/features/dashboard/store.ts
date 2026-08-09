import { createStore } from '@/store/create-store'

export type Kpi = {
  key: string
  label: string
  value: number
  tone: string
  sub: string
}

export type Dept = {
  key: string
  name: string
  href: string
  pipeline: { unscheduled: number; scheduled: number; inProduction: number; completedToday: number }
  load: number
  cap: number
}

export type DueOrder = {
  id: number
  order: string
  customer: string
  dept: string
  href: string
  shipDate: string
  priority: string
  status: string
  overdue: boolean
}

export type DashboardState = {
  role: string
  searchTerm: string
  kpis: Kpi[]
  depts: Dept[]
  dueOrders: DueOrder[]
}

const KPIS: Kpi[] = [
  { key: 'dueToday', label: 'Due today', value: 6, tone: 'accent', sub: '+2 since yesterday' },
  { key: 'overdue', label: 'Overdue', value: 3, tone: 'danger', sub: 'Needs attention' },
  { key: 'inProduction', label: 'In production', value: 31, tone: '', sub: 'Across 4 departments' },
  {
    key: 'readyToShip',
    label: 'Ready to ship',
    value: 9,
    tone: 'success',
    sub: 'Awaiting loadout'
  },
  { key: 'lowCoils', label: 'Low coils', value: 2, tone: 'amber', sub: 'Below reorder point' }
]

const DEPTS: Dept[] = [
  {
    key: 'trim',
    name: 'Trim',
    href: '/trim',
    pipeline: { unscheduled: 12, scheduled: 18, inProduction: 14, completedToday: 6 },
    load: 4200,
    cap: 5000
  },
  {
    key: 'rollforming',
    name: 'Rollforming',
    href: '/rollforming',
    pipeline: { unscheduled: 5, scheduled: 9, inProduction: 6, completedToday: 3 },
    load: 2600,
    cap: 5000
  },
  {
    key: 'accessories',
    name: 'Accessories',
    href: '/accessories',
    pipeline: { unscheduled: 3, scheduled: 4, inProduction: 2, completedToday: 1 },
    load: 1200,
    cap: 5000
  },
  {
    key: 'shipping',
    name: 'Shipping',
    href: '/shipping',
    pipeline: { unscheduled: 4, scheduled: 11, inProduction: 9, completedToday: 5 },
    load: 4650,
    cap: 5000
  }
]

const DUE_ORDERS: DueOrder[] = [
  {
    id: 1,
    order: '338009',
    customer: 'Waterford Sheet Metal',
    dept: 'Trim',
    href: '/trim',
    shipDate: '2026-07-13',
    priority: 'Now',
    status: 'In Progress',
    overdue: true
  },
  {
    id: 2,
    order: '338003',
    customer: 'Delhi Roofing Supply',
    dept: 'Rollforming',
    href: '/rollforming',
    shipDate: '2026-07-12',
    priority: 'ASAP',
    status: 'Not Started',
    overdue: true
  },
  {
    id: 3,
    order: '338014',
    customer: 'Brant Building Products',
    dept: 'Accessories',
    href: '/accessories',
    shipDate: '2026-07-11',
    priority: 'By 5:00',
    status: 'Cut',
    overdue: true
  },
  {
    id: 4,
    order: '338004',
    customer: 'Aylmer Steel Supply',
    dept: 'Trim',
    href: '/trim',
    shipDate: '2026-07-15',
    priority: 'ASAP',
    status: 'Wrapped',
    overdue: false
  },
  {
    id: 5,
    order: '338011',
    customer: 'Norwich Exteriors',
    dept: 'Rollforming',
    href: '/rollforming',
    shipDate: '2026-07-17',
    priority: '',
    status: 'Not Started',
    overdue: false
  },
  {
    id: 6,
    order: '338006',
    customer: 'Courtland Roofing',
    dept: 'Accessories',
    href: '/accessories',
    shipDate: '2026-07-16',
    priority: 'Now',
    status: 'In Progress',
    overdue: false
  },
  {
    id: 7,
    order: '338013',
    customer: 'Simcoe Exteriors',
    dept: 'Shipping',
    href: '/shipping',
    shipDate: '2026-07-14',
    priority: 'ASAP',
    status: 'Ready to Ship',
    overdue: false
  },
  {
    id: 8,
    order: '338016',
    customer: 'Langton Metal Roofing',
    dept: 'Shipping',
    href: '/shipping',
    shipDate: '2026-07-18',
    priority: '',
    status: 'Ready to Ship',
    overdue: false
  }
]

export const dashboardStore = createStore<DashboardState>({
  role: 'Manager',
  searchTerm: '',
  kpis: KPIS,
  depts: DEPTS,
  dueOrders: DUE_ORDERS
})

export const setSearch = (searchTerm: string) => dashboardStore.set({ searchTerm })

export const PRI_CLASS: Record<string, string> = {
  Now: 'pri-now',
  ASAP: 'pri-asap',
  'By 5:00': 'pri-by'
}

export const ST_CLASS: Record<string, string> = {
  'Not Started': 'st-notstarted',
  'In Progress': 'st-inprogress',
  Cut: 'st-cut',
  Bent: 'st-bent',
  Wrapped: 'st-wrapped',
  'Ready to Ship': 'st-ready'
}

export const capClass = (pct: number) =>
  pct > 90 ? 'bar-red' : pct > 70 ? 'bar-amber' : 'bar-green'

/** An order deep-links to the tab it currently lives in, not to its department's landing view. */
const DEPT_TAB: Record<string, string> = {
  Trim: 'production',
  Rollforming: 'production',
  Accessories: 'packaging',
  Shipping: 'scheduled'
}

export const deepLink = (order: DueOrder) => {
  const tab = DEPT_TAB[order.dept]
  return tab ? `${order.href}?view=${tab}` : order.href
}
