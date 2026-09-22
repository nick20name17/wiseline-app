import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const DEPARTMENTS = [
  { id: 1, name: 'Trim', code: 'trim' },
  { id: 2, name: 'Rollforming', code: 'rollforming' }
]

const PRIORITIES = [
  { id: 3, name: 'ASAP', color: '#dc2626', position: 1, department: 1 },
  { id: 4, name: 'By 10:00', color: '#b58608', position: 2, department: 1 },
  { id: 9, name: 'Rush', color: '#16a34a', position: 1, department: 2 }
]

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await page.route(`${API_URL}/departments/all/`, route => route.fulfill({ json: DEPARTMENTS }))
  await page.route(`${API_URL}/priorities/`, route => route.fulfill({ json: PRIORITIES }))
  await page.goto('/settings/priorities')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
})

test('every department’s priorities are listed with their hierarchy', async ({ page }) => {
  await expect(page.getByText('3 priorities')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'By 10:00' })
  await expect(row.getByText('Trim')).toBeVisible()
  await expect(row.getByText('2', { exact: true })).toBeVisible()
  // A priority belongs to one department, so the other's is named as its own.
  await expect(
    page.getByRole('row').filter({ hasText: 'Rush' }).getByText('Rollforming')
  ).toBeVisible()
})

test('the search narrows the list', async ({ page }) => {
  await page.getByLabel('Search priorities').fill('asap')

  await expect(page.getByText('ASAP')).toBeVisible()
  await expect(page.getByText('By 10:00')).toBeHidden()
})

test('a priority is created against a department', async ({ page }) => {
  const posted: Record<string, unknown>[] = []
  await page.route(`${API_URL}/priorities/`, async route => {
    if (route.request().method() === 'POST') {
      posted.push(route.request().postDataJSON() as Record<string, unknown>)
      return route.fulfill({
        json: { id: 11, name: 'NOW', color: '#dc2626', position: 0, department: 1 }
      })
    }
    return route.fulfill({ json: PRIORITIES })
  })

  await page.getByRole('button', { name: 'Add priority' }).click()
  await page.getByLabel('Name').fill('NOW')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect.poll(() => posted[0]?.name).toBe('NOW')
  await expect.poll(() => posted[0]?.department).toBe(1)
})

test('deleting one says what it costs', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete ASAP' }).click()

  await expect(page.getByText('Delete priority ASAP?')).toBeVisible()
  await expect(page.getByText(/sort as unprioritised/)).toBeVisible()
})
