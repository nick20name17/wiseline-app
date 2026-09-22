import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const WAREHOUSES = {
  count: 1,
  results: [
    {
      id: 1,
      name: 'Tillsonburg',
      address: '21 Clearview Dr',
      description: null,
      position: 1,
      locations: []
    }
  ]
}

const DEPARTMENTS = [{ id: 1, name: 'Trim', code: 'trim' }]

const TYPES = [
  {
    id: 7,
    name: 'Trim racks',
    warehouse_id: 1,
    department_id: 1,
    description: 'Racks along the north wall',
    position: 1
  }
]

const LOCATIONS = {
  count: 2,
  results: [
    {
      id: 11,
      code: '101',
      position: 1,
      warehouse_id: 1,
      location_type_id: 7,
      weight: 500,
      dimensions: '8 × 4 ft',
      description: 'By the door',
      multi_order: true,
      max_orders: 4
    },
    {
      id: 12,
      code: '102',
      position: 2,
      warehouse_id: 1,
      location_type_id: 7,
      weight: null,
      dimensions: null,
      description: null,
      multi_order: false,
      max_orders: null
    }
  ]
}

const signIn = async (page: Parameters<typeof mockAuthApi>[0]) => {
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
}

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await page.route(`${API_URL}/departments/all/`, route => route.fulfill({ json: DEPARTMENTS }))
  await page.route(`${API_URL}/warehouses/*`, route => route.fulfill({ json: WAREHOUSES }))
  await page.route(`${API_URL}/location-types/all/*`, route => route.fulfill({ json: TYPES }))
  await page.route(`${API_URL}/location-types/*`, route =>
    route.fulfill({ json: { count: TYPES.length, results: TYPES } })
  )
  await page.route(`${API_URL}/locations/*`, route => route.fulfill({ json: LOCATIONS }))
})

test('the locations list names the warehouse and type each one hangs off', async ({ page }) => {
  await page.goto('/settings/locations')
  await signIn(page)

  await expect(page.getByText('2 locations')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: '101' })
  await expect(row.getByText('Tillsonburg')).toBeVisible()
  await expect(row.getByText('Trim racks')).toBeVisible()
  // A multi-order location says how many it takes; a single-order one says nothing.
  await expect(row.getByText('4')).toBeVisible()
})

test('a location offers only the types in its own warehouse', async ({ page }) => {
  await page.goto('/settings/locations')
  await signIn(page)
  await page.getByRole('button', { name: 'Create location' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Trim racks')).toBeVisible()
  // How many orders only matters once the location takes more than one.
  await expect(dialog.getByLabel('How many orders')).toBeHidden()
  await dialog.getByRole('switch').click()
  await expect(dialog.getByLabel('How many orders')).toBeVisible()
})

test('a location type carries the department its locations inherit', async ({ page }) => {
  await page.goto('/settings/location-types')
  await signIn(page)

  const row = page.getByRole('row').filter({ hasText: 'Trim racks' })
  await expect(row.getByText('Trim', { exact: true })).toBeVisible()
  await expect(row.getByText('Tillsonburg')).toBeVisible()
})

test('deleting a type says why it may be refused', async ({ page }) => {
  await page.goto('/settings/location-types')
  await signIn(page)
  await page.getByRole('button', { name: 'Delete Trim racks' }).click()

  await expect(page.getByText('Delete location type Trim racks?')).toBeVisible()
  await expect(page.getByText(/left without a department/)).toBeVisible()
})
