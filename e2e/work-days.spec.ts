import { expect, test, type Route } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const HOLIDAYS: Record<number, { id: number; date: string; name: string }[]> = {
  2026: [
    { id: 1, date: '2026-12-25', name: 'Christmas Day' },
    { id: 2, date: '2026-12-26', name: 'Boxing Day' }
  ],
  2027: []
}

const fulfillList = (route: Route) => {
  const year = Number(new URL(route.request().url()).searchParams.get('year'))
  return route.fulfill({ json: HOLIDAYS[year] ?? [] })
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-25T09:00:00'))
  await mockAuthApi(page)
  await page.route(`${API_URL}/holidays/?*`, fulfillList)
  await page.goto('/settings/work-days')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
})

test('lists the year’s holidays and steps between years', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible()
  await expect(page.getByRole('row', { name: /Christmas Day/ })).toContainText('Fri, Dec 25, 2026')
  await expect(page.getByText('2 holidays')).toBeVisible()

  await page.getByRole('button', { name: 'Next year' }).click()
  await expect(page).toHaveURL(/year=2027/)
  await expect(page.getByText('No holidays in 2027')).toBeVisible()
  await page.getByRole('button', { name: 'This year' }).click()
  await expect(page.getByRole('row', { name: /Boxing Day/ })).toBeVisible()
})

test('adds a holiday with the date and name the server expects', async ({ page }) => {
  let posted: unknown
  await page.route(`${API_URL}/holidays/`, route => {
    posted = route.request().postDataJSON()
    return route.fulfill({ json: { id: 3, ...(posted as object) } })
  })

  await page.getByRole('button', { name: 'Add holiday' }).click()
  const dialog = page.getByRole('dialog')
  // A new holiday this year starts on today.
  await expect(dialog.getByLabel('Date')).toHaveText(/Fri, Sep 25, 2026/)
  await dialog.getByLabel('Name').fill('  Thanksgiving  ')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual({ date: '2026-09-25', name: 'Thanksgiving' })
})

test('a date that already has a holiday keeps the dialog open with the server’s reason', async ({
  page
}) => {
  await page.route(`${API_URL}/holidays/`, route =>
    route.fulfill({ status: 409, json: { detail: '2026-09-25 is already a holiday.' } })
  )

  await page.getByRole('button', { name: 'Add holiday' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add holiday' })
  await dialog.getByLabel('Name').fill('Duplicate')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('2026-09-25 is already a holiday.')).toBeVisible()
  await expect(dialog).toBeVisible()
})

test('deleting a holiday asks first', async ({ page }) => {
  let deleted = false
  await page.route(`${API_URL}/holidays/1/`, route => {
    deleted = route.request().method() === 'DELETE'
    return route.fulfill({ status: 204 })
  })

  await page.getByRole('button', { name: 'Delete Christmas Day' }).click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('becomes a work day again')
  await confirm.getByRole('button', { name: 'Delete' }).click()

  await expect(confirm).toBeHidden()
  expect(deleted).toBe(true)
})

test('a holiday saved into another year opens that year', async ({ page }) => {
  await page.route(`${API_URL}/holidays/1/`, route =>
    route.fulfill({ json: { id: 1, date: '2027-12-25', name: 'Christmas Day' } })
  )

  await page.getByRole('button', { name: 'Edit Christmas Day' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit holiday' })
  await dialog.getByLabel('Date').click()
  await page.getByRole('combobox', { name: /year/i }).selectOption('2027')
  await page.getByRole('button', { name: /December 25th, 2027/ }).click()
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page).toHaveURL(/year=2027/)
  await expect(page.getByRole('heading', { name: '2027' })).toBeVisible()
})

test('a list that did not load says so instead of «no holidays»', async ({ page }) => {
  await page.route(`${API_URL}/holidays/?*`, route =>
    route.fulfill({ status: 500, json: { detail: 'boom' } })
  )
  await page.getByRole('button', { name: 'Next year' }).click()

  await expect(page.getByText('The holidays of 2027 did not load')).toBeVisible()
  await expect(page.getByText('No holidays in 2027')).toBeHidden()
})
