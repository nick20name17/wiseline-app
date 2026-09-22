import type { Page } from '@playwright/test'
import { API_URL, password, user } from './api.ts'

const DEPARTMENT = { id: 1, name: 'Trim', code: 'trim' }

const PRIORITIES = [
  { id: 3, name: 'Rush', color: '#dc2626', position: 1, department: DEPARTMENT.id },
  { id: 4, name: 'Standard', color: '#2563eb', position: 2, department: DEPARTMENT.id },
  // Another department's priority must not reach this page.
  { id: 9, name: 'Rollforming only', color: '#16a34a', position: 1, department: 2 }
]

const ORDER = {
  id: 'ARINV-1',
  invoice: '330605',
  customer: 'H F H Inc',
  crea_date: '2024-05-06',
  ship_date: '2024-05-09',
  count_items: 2,
  total_weight: 120,
  sales_order: { id: 11, order: 'ARINV-1', is_stock: false, department_states: [] },
  origin_items: [
    {
      id: 'DET-1',
      category: 'Trim',
      id_inven: 'TRC8250',
      description: 'Ridge Cap Dark Red',
      quantity: 8,
      width: 14,
      length: 120,
      bends: 3,
      weight: 60,
      production_date: null,
      item: null
    },
    {
      id: 'DET-2',
      category: 'Trim',
      id_inven: 'TED8250',
      description: 'Eave Drip Dark Red',
      quantity: 16,
      width: 6,
      length: 120,
      bends: 2,
      weight: 60,
      production_date: null,
      item: null
    }
  ]
}

const STOCK_ORDER = {
  id: 'S1041',
  invoice: 'S1041',
  customer: 'Stock',
  crea_date: '2024-05-08',
  ship_date: null,
  count_items: 1,
  total_weight: 0,
  sales_order: { id: 12, order: 'S1041', is_stock: true, department_states: [] },
  origin_items: []
}

const machine = (id: number, name: string, position: number, kind: string) => ({
  id,
  name,
  department: DEPARTMENT.id,
  position,
  kind,
  daily_max_pieces: null,
  daily_max_bends: kind === 'bending' ? 1200 : null
})

// The Slinet cuts, the rest bend, and Wrapping is the station after them — which is what tells the
// Production tab apart from the machine it is standing at.
const SLINET = machine(8, 'Slinet', 0, 'cutting')

const MACHINES = [
  SLINET,
  machine(1, 'Press Brake', 1, 'bending'),
  machine(2, 'V1', 2, 'bending'),
  machine(3, 'V2', 3, 'bending'),
  machine(4, 'Roll Former', 4, 'rollforming'),
  machine(5, 'Caps', 5, 'bending'),
  machine(6, 'Flat Stock', 6, 'bending'),
  machine(7, 'Wrapping', 7, 'wrapping')
]

const BENDERS = MACHINES.filter(entry => entry.kind !== 'cutting' && entry.kind !== 'wrapping')

const SCHEDULED_DAY = '2026-09-23'

const scheduledLine = (
  id: string,
  inven: string,
  description: string,
  quantity: number,
  item: Record<string, unknown>
) => ({
  id,
  category: 'Trim',
  id_inven: inven,
  description,
  quantity,
  width: 14,
  length: 120,
  bends: 3,
  weight: 40,
  production_date: SCHEDULED_DAY,
  item: {
    id: Number(id.replace(/\D/g, '')) || 1,
    status: null,
    production_date: SCHEDULED_DAY,
    department: DEPARTMENT.id,
    over_due: false,
    flow: null,
    vented: false,
    pull_from_stock: 0,
    width: null,
    description: null,
    ...item
  }
})

/** Reviewed, every line on a machine — ready to be released. */
const READY_ORDER = {
  id: 'ARINV-2',
  invoice: '330608',
  customer: 'Jireh Tools',
  crea_date: '2024-05-06',
  ship_date: '2024-05-09',
  count_items: 1,
  total_weight: 40,
  sales_order: {
    id: 21,
    order: 'ARINV-2',
    is_stock: false,
    department_states: [
      {
        id: 31,
        department: DEPARTMENT.id,
        reviewed: true,
        release_to_production: false,
        priority: null,
        production_date: SCHEDULED_DAY,
        status: null,
        over_due: false
      }
    ]
  },
  origin_items: [
    scheduledLine('101', 'TRC8250', 'Ridge Cap Dark Red', 8, { id: 101, flow: BENDERS[0] })
  ]
}

/** Not reviewed, and one line still without a machine — the gate the board puts on Reviewed. */
const UNREVIEWED_ORDER = {
  id: 'ARINV-3',
  invoice: '330615',
  customer: 'DAP Roofing Inc.',
  crea_date: '2024-05-06',
  ship_date: '2024-05-10',
  count_items: 1,
  total_weight: 40,
  sales_order: {
    id: 22,
    order: 'ARINV-3',
    is_stock: false,
    department_states: [
      {
        id: 32,
        department: DEPARTMENT.id,
        reviewed: false,
        release_to_production: false,
        priority: null,
        production_date: SCHEDULED_DAY,
        status: null,
        over_due: false
      }
    ]
  },
  origin_items: [scheduledLine('102', 'TED8250', 'Eave Drip Dark Red', 16, { id: 102, flow: null })]
}

/** A stock order, so the type exclusion has something to lock against. */
const SCHEDULED_STOCK_ORDER = {
  ...STOCK_ORDER,
  id: 'S1042',
  invoice: 'S1042',
  sales_order: {
    id: 23,
    order: 'S1042',
    is_stock: true,
    department_states: [
      {
        id: 33,
        department: DEPARTMENT.id,
        reviewed: true,
        release_to_production: false,
        priority: null,
        production_date: SCHEDULED_DAY,
        status: null,
        over_due: false
      }
    ]
  },
  origin_items: []
}

/** A day already gone, so the past-due treatment has a row to sit on. */
const OVERDUE_ORDER = {
  ...READY_ORDER,
  id: 'ARINV-4',
  invoice: '338009',
  customer: 'Waterford Sheet Metal',
  sales_order: {
    id: 24,
    order: 'ARINV-4',
    is_stock: false,
    department_states: [
      {
        id: 34,
        department: DEPARTMENT.id,
        reviewed: true,
        release_to_production: false,
        priority: null,
        production_date: '2026-09-18',
        status: null,
        over_due: true
      }
    ]
  },
  origin_items: []
}

export const SCHEDULED_ORDERS = [
  OVERDUE_ORDER,
  SCHEDULED_STOCK_ORDER,
  READY_ORDER,
  UNREVIEWED_ORDER
]

const cutlistRow = (
  id: number,
  width: number,
  length: number,
  machine: number | null,
  quantity: number,
  extra: Record<string, unknown> = {}
) => ({
  id,
  width,
  length,
  machine,
  vented: false,
  quantity,
  complete: false,
  operator_notes: null,
  is_standard_length: length === 120,
  sources: [{ order: 'ARINV-2', origin_item: '101', quantity }],
  ...extra
})

/** The Slinet's list: one row per machine per size, which the board reads as columns. */
const CUTLIST = {
  id: 501,
  department: DEPARTMENT.id,
  kind: 'cutlist',
  machine: SLINET.id,
  production_date: SCHEDULED_DAY,
  gauge: '26ga',
  color: 'Charcoal',
  gauge_color: '26ga - Charcoal',
  priority: PRIORITIES[0],
  released_at: '2026-09-21T09:00:00',
  completed_at: null,
  is_complete: false,
  rows: [
    cutlistRow(1, 12.5, 120, 1, 12),
    cutlistRow(2, 14, 96, 3, 8),
    // The same size again, vented: on the Slinet those pieces leave V2's column for their own.
    cutlistRow(3, 14, 96, 3, 18, { vented: true })
  ]
}

/** A list from a day already gone, and unfinished — the board paints those overdue. */
const OVERDUE_CUTLIST = {
  ...CUTLIST,
  id: 502,
  production_date: '2026-09-18',
  gauge_color: '24ga - Galvalume',
  priority: null,
  rows: [cutlistRow(4, 8, 120, 1, 4)]
}

/** Every row signed off, so Done has something to act on. */
const READY_CUTLIST = {
  ...CUTLIST,
  id: 503,
  gauge_color: '26ga - Bright White',
  is_complete: true,
  rows: [cutlistRow(5, 10, 120, 1, 6, { complete: true })]
}

const DONE_CUTLIST = {
  ...READY_CUTLIST,
  id: 504,
  completed_at: '2026-09-21T16:20:00'
}

/** Press Brake's own list: one row per size, all of it for this machine. */
const BENDLIST = {
  ...CUTLIST,
  id: 601,
  kind: 'bendlist',
  machine: 1,
  gauge_color: '26ga - Charcoal',
  rows: [cutlistRow(11, 12.5, 120, 1, 12)]
}

const COILS = [
  {
    id: 71,
    lot_number: '37067677',
    product_id: 'CS488306',
    coil_thickness: 4.125,
    linear_feet: 1533,
    weight: 3986,
    note: null
  }
]

const COMPLETED = {
  count: 2,
  window_days: 90,
  results: [
    {
      order: 'ARINV-9',
      order_number: '338008',
      customer: 'Vittoria Metal Works',
      is_stock: false,
      completed_at: '2026-09-19T11:18:00',
      production_date: '2026-09-16',
      ship_date: '2026-09-21'
    },
    {
      order: 'S1039',
      order_number: 'S1039',
      customer: 'Stock',
      is_stock: true,
      completed_at: '2026-09-12T14:47:00',
      production_date: '2026-09-10',
      ship_date: null
    }
  ]
}

const COMPLETED_DETAIL = {
  order: 'ARINV-9',
  order_number: '338008',
  is_stock: false,
  completed_at: '2026-09-19T11:18:00',
  line_items: [
    {
      origin_item: '901',
      product_id: 'TSWB262',
      description: 'Sidewall Flashing',
      qty_ordered: 36,
      from_stock: 0,
      packaged: 36,
      status: 'wrapped'
    },
    {
      origin_item: '902',
      product_id: 'TRAKE24',
      description: 'Rake Trim',
      qty_ordered: 24,
      from_stock: 4,
      packaged: 20,
      status: 'wrapped'
    }
  ],
  packages: [
    {
      package_id: 71,
      name: '01-338008-01',
      weight: 120,
      location: '101',
      is_loaded: false,
      contents: [{ origin_item: '901', quantity: 36 }]
    }
  ]
}

const dayStrip = (start: string, days: number) =>
  Array.from({ length: days }, (_, index) => {
    const date = new Date(`${start}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + index)
    return {
      date: date.toISOString().slice(0, 10),
      pieces: 120,
      pieces_from_stock: 0,
      bends: 1000,
      bends_from_stock: 0,
      capacity: 5000,
      over_capacity: false
    }
  })

export const mockTrimApi = async (page: Page) => {
  await page.route(`${API_URL}/departments/all/`, route => route.fulfill({ json: [DEPARTMENT] }))
  await page.route(`${API_URL}/priorities/`, route => route.fulfill({ json: PRIORITIES }))
  // The tab the request is for is in `is_scheduled`, the same way the board splits the two lists.
  await page.route(`${API_URL}/ebms/orders/*`, route => {
    const scheduled = new URL(route.request().url()).searchParams.get('is_scheduled') === 'true'
    void route.fulfill({
      json: scheduled
        ? { count: SCHEDULED_ORDERS.length, results: SCHEDULED_ORDERS }
        : { count: 2, results: [STOCK_ORDER, ORDER] }
    })
  })
  await page.route(`${API_URL}/flows/all/*`, route => route.fulfill({ json: MACHINES }))
  await page.route(`${API_URL}/locations/*`, route =>
    route.fulfill({ json: { count: 1, results: [{ id: 5, code: '231' }] } })
  )
  await page.route(`${API_URL}/departments/${DEPARTMENT.id}/overdue/`, route =>
    route.fulfill({ json: { days: [], orders_by_day: {}, orders: 0, line_items: 0 } })
  )
  await page.route(`${API_URL}/departments/${DEPARTMENT.id}/machine-capacities/*`, route =>
    route.fulfill({
      json: {
        date: SCHEDULED_DAY,
        total: {
          pieces: 24,
          pieces_from_stock: 4,
          bends: 1000,
          bends_from_stock: 0,
          capacity: 5000
        },
        machines: BENDERS.map(station => ({
          flow_id: station.id,
          name: station.name,
          pieces: 8,
          pieces_from_stock: 0,
          max_pieces: null,
          bends: 300,
          bends_from_stock: 0,
          max_bends: 1200,
          over_bends: false
        })),
        pieces_without_a_machine: 0
      }
    })
  )
  await page.route(`${API_URL}/departments/${DEPARTMENT.id}/allocated-stock/*`, route =>
    route.fulfill({
      json: [
        {
          color: 'Charcoal',
          product_id: 'TSG8306',
          description: 'Snow Guard Charcoal',
          qty: 7,
          starts_color_group: true
        }
      ]
    })
  )
  await page.route(`${API_URL}/orders/notes/`, route =>
    route.fulfill({
      json: {
        'ARINV-1': {
          has_note: true,
          text: 'Would like this order by 4:30 tomorrow',
          author: 'Henry Wall',
          created_at: '2024-05-07T10:42:00',
          read: false,
          read_at: null
        }
      }
    })
  )
  await page.route(`${API_URL}/items/notes/`, route => route.fulfill({ json: {} }))
  // One order, then the list: a later route wins, and only the list request carries a query.
  await page.route(`${API_URL}/departments/${DEPARTMENT.id}/completed-orders/**`, route =>
    route.fulfill({ json: COMPLETED_DETAIL })
  )
  await page.route(`${API_URL}/departments/${DEPARTMENT.id}/completed-orders/?*`, route =>
    route.fulfill({ json: COMPLETED })
  )
  await page.route(`${API_URL}/packages/*/reprint/`, route => route.fulfill({ json: {} }))
  await page.route(`${API_URL}/cutlists/*/coils/`, route => route.fulfill({ json: COILS }))
  await page.route(`${API_URL}/cutlists/*/done/`, route => route.fulfill({ json: DONE_CUTLIST }))
  await page.route(`${API_URL}/cutlists/rows/*`, route =>
    route.fulfill({ json: { ...CUTLIST.rows[0], complete: true } })
  )
  // One route for both sub-tabs: the tab the request is for is in `kind`, and `completed` says
  // which half of it.
  await page.route(`${API_URL}/cutlists/*`, route => {
    const params = new URL(route.request().url()).searchParams
    const done = params.get('completed') === 'true'
    if (params.get('kind') === 'bendlist')
      return void route.fulfill({ json: done ? [] : [BENDLIST] })
    void route.fulfill({
      json: done ? [DONE_CUTLIST] : [OVERDUE_CUTLIST, CUTLIST, READY_CUTLIST]
    })
  })
  await page.route(`${API_URL}/departments/${DEPARTMENT.id}/day-strip/*`, route => {
    const url = new URL(route.request().url())
    const start = url.searchParams.get('start') ?? '2024-05-08'
    void route.fulfill({ json: dayStrip(start, Number(url.searchParams.get('days') ?? 5)) })
  })
}

export const signIn = async (page: Page) => {
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
}
