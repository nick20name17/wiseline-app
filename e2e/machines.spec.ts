import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const DEPARTMENTS = [
  { id: 1, name: 'Trim', code: 'trim', position: 1 },
  { id: 2, name: 'Rollforming', code: 'rollforming', position: 2 },
  { id: 3, name: 'Accessories', code: 'accessories', position: 3 }
]

const CATEGORIES = [
  { id: 'CAT-TRIM', name: 'Trim' },
  { id: 'CAT-ROLL', name: 'Rollforming' }
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
    id: 85,
    name: 'Tuff Rib & Diamond Rib',
    description: null,
    position: 1,
    category: 'CAT-ROLL',
    department: 2,
    kind: 'rollforming',
    ebms_profile_names: ['Tuff Rib'],
    daily_max_pieces: null,
    daily_max_bends: null
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

test('each department is an open card, counted, with its machines’ daily max', async ({ page }) => {
  await expect(page.getByText('machines across departments')).toContainText('3')
  // A department with none offers to add one rather than showing an empty card.
  await expect(page.getByRole('button', { name: 'Add one' })).toBeVisible()

  const press = page.getByRole('listitem').filter({ hasText: 'Press Brake' })
  await expect(press).toContainText('1200 bends / day')
  await expect(page.getByRole('listitem').filter({ hasText: 'Slinet' })).toContainText('Gateway')

  await page.getByRole('button', { name: 'Collapse Trim' }).click()
  await expect(press).toBeHidden()
})

test('deleting a machine says what goes with it', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete Press Brake' }).click()

  await expect(page.getByText('Delete machine Press Brake?')).toBeVisible()
  await expect(page.getByText(/left without a machine/)).toBeVisible()
})

test('a rollformer runs every EBMS profile listed on it, one a line', async ({ page }) => {
  let saved: unknown
  await page.route(`${API_URL}/flows/85/`, route => {
    saved = route.request().postDataJSON()
    return route.fulfill({ json: {} })
  })
  await page.getByRole('button', { name: 'Edit Tuff Rib & Diamond Rib' }).click()

  const profiles = page.getByLabel('EBMS profiles')
  await expect(profiles).toHaveValue('Tuff Rib')
  await profiles.fill('Tuff Rib\n  Diamond Rib \n\nREVERSED Diamond Rib')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect
    .poll(() => (saved as { ebms_profile_names?: string[] } | undefined)?.ebms_profile_names)
    .toEqual(['Tuff Rib', 'Diamond Rib', 'REVERSED Diamond Rib'])
})
