import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const DEPARTMENTS = [{ id: 1, name: 'Trim', code: 'trim' }]

const CATEGORIES = [
  { id: 'CAT-TRIM', name: 'Trim', capacity: 5000, capacity_id: 4 },
  { id: 'CAT-ROLL', name: 'Rollforming', capacity: null, capacity_id: null }
]

const MACHINES = [
  {
    id: 1,
    name: 'Press Brake',
    description: null,
    position: 1,
    category: 'CAT-TRIM',
    department: 1,
    kind: 'bending',
    daily_max_pieces: null,
    daily_max_bends: 1200
  },
  {
    id: 8,
    name: 'Slinet',
    description: null,
    position: 0,
    category: 'CAT-TRIM',
    department: 1,
    kind: 'cutting',
    daily_max_pieces: null,
    daily_max_bends: null
  }
]

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await page.route(`${API_URL}/departments/all/`, route => route.fulfill({ json: DEPARTMENTS }))
  await page.route(`${API_URL}/ebms/categories/all/*`, route => route.fulfill({ json: CATEGORIES }))
  await page.route(`${API_URL}/flows/all/*`, route => route.fulfill({ json: MACHINES }))
  await page.goto('/settings/machines')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
})

test('machines are listed under the category their department is linked to', async ({ page }) => {
  await expect(page.getByText('2 machines')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'Press Brake' })
  await expect(row.getByText('Bending')).toBeVisible()
  await expect(row.getByText('1200')).toBeVisible()
  // The cutter has no bends to cap, and says so rather than showing a nought.
  await expect(
    page.getByRole('row').filter({ hasText: 'Slinet' }).getByText('Cutting')
  ).toBeVisible()
})

test('the daily capacity is the category’s, and is set from here', async ({ page }) => {
  const patched: unknown[] = []
  await page.route(`${API_URL}/capacities/**`, route => {
    patched.push(route.request().postDataJSON())
    return route.fulfill({ json: { id: 4, per_day: 6000, category: 'CAT-TRIM', department: 1 } })
  })

  const capacity = page.getByLabel('Daily capacity for Trim')
  await expect(capacity).toHaveValue('5000')
  await capacity.fill('6000')
  await capacity.blur()

  await expect.poll(() => patched.length).toBe(1)
})

test('deleting a machine says what goes with it', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete Press Brake' }).click()

  await expect(page.getByText('Delete machine Press Brake?')).toBeVisible()
  await expect(page.getByText(/left without a machine/)).toBeVisible()
})
