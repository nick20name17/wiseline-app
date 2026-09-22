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

const MACHINES = [
  { id: 1, name: 'Press Brake', department: DEPARTMENT.id, position: 1 },
  { id: 2, name: 'V1', department: DEPARTMENT.id, position: 2 },
  { id: 3, name: 'V2', department: DEPARTMENT.id, position: 3 }
]

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
    scheduledLine('101', 'TRC8250', 'Ridge Cap Dark Red', 8, { id: 101, flow: MACHINES[0] })
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

export const SCHEDULED_ORDERS = [SCHEDULED_STOCK_ORDER, READY_ORDER, UNREVIEWED_ORDER]

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
        machines: MACHINES.map(machine => ({
          flow_id: machine.id,
          name: machine.name,
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
