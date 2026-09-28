import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi, user } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

// A Trim Worker: the server's assignment says so; everything else is the board's own fixtures.
test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.route(`${API_URL}/departments/users/assignments/*`, route =>
    route.fulfill({ json: [{ user: user.id, department: 1, role: 'worker' }] })
  )
  await page.goto('/trim')
  await signIn(page)
})

test('a Worker sees the board from Production down, and is moved off a Manager tab', async ({
  page
}) => {
  // p1 (657,256): «Trim Workers should be able to see everything from here down».
  await expect(page).toHaveURL(/view=production/)
  const strip = page.getByRole('tablist').first()
  await expect(strip.getByRole('tab', { name: /Production/ })).toBeVisible()
  await expect(strip.getByRole('tab', { name: /Coils/ })).toBeVisible()
  await expect(strip.getByRole('tab', { name: /Unscheduled/ })).toBeHidden()
  await expect(strip.getByRole('tab', { name: /Scheduled/ })).toBeHidden()
  await expect(strip.getByRole('tab', { name: /Calendar/ })).toBeHidden()

  await page.goto('/trim?view=unscheduled')
  await expect(page).toHaveURL(/view=production/)
})

test('a Worker’s lists are one list by production date, with a line between the days', async ({
  page
}) => {
  // p1 (667,260): no day to pick, the released lists sorted by Production Date, the days apart.
  await expect(page.getByRole('button', { name: /Pick a day/ })).toBeHidden()
  const main = page.getByRole('main')
  await expect(main.getByText('26ga - Charcoal').first()).toBeVisible()
  const text = await main.innerText()
  const overdue = text.indexOf('24ga - Galvalume')
  const today = text.indexOf('26ga - Charcoal')
  expect(overdue).toBeGreaterThan(-1)
  expect(overdue).toBeLessThan(today)
  await expect(main.getByText(/Fri, Sep 18, 2026/i).first()).toBeVisible()
  await expect(main.getByText(/Wed, Sep 23, 2026/i).first()).toBeVisible()
})

test('a Worker’s Coils tab is the Manager’s Coil Filter, not a filter of his own', async ({
  page
}) => {
  // p1 (1057,303): filtered by the coil filter in the Manager window, same authorities.
  await page.getByRole('tab', { name: /Coils/ }).first().click()
  // Only Trim Coils — what the Manager's filter lets in — and no filter of his own to set.
  await expect(page.getByRole('tab', { name: 'All Trim Coils' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Coil Filter' })).toBeHidden()
  await expect(page.getByRole('tab', { name: 'All Coils' })).toBeHidden()
  // The same authorities as the Manager's tab: he adjusts a coil like the Manager does.
  await expect(
    page.getByRole('button', { name: /^Adjust Linear Feet of coil / }).first()
  ).toBeEnabled()
})
