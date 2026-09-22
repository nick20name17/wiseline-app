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
  await page.route(`${API_URL}/ebms/orders/*`, route =>
    route.fulfill({ json: { count: 2, results: [STOCK_ORDER, ORDER] } })
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
