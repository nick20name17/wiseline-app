import { expect, test } from '@playwright/test'
import { mockAuthApi } from './api.ts'
import { capturePrints, mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim?view=completed')
  await signIn(page)
  await expect(page).toHaveURL(/view=completed/)
})

test('the tab lists what the department finished, newest first', async ({ page }) => {
  const row = page.getByRole('row').filter({ hasText: '338008' })
  await expect(row.getByText('Vittoria Metal Works')).toBeVisible()
  await expect(row.getByText(/Sat, September 19, 2026/)).toBeVisible()
  // A stock order has no customer of its own and says so.
  await expect(page.getByRole('row').filter({ hasText: 'S1039' }).getByText('Stock')).toBeVisible()
})

test('an order opens with its line items and packages', async ({ page }) => {
  await page.getByRole('row').filter({ hasText: '338008' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Completed · 338008 · Vittoria Metal Works')).toBeVisible()
  await expect(dialog.getByText(/manufacturing batch 56 pcs \(Qty − Stock\)/)).toBeVisible()
  await expect(dialog.getByRole('columnheader', { name: 'Remanufactured' })).toBeVisible()
  const stock = dialog.getByRole('row').filter({ hasText: 'TRAKE24' })
  await expect(stock.getByText('4', { exact: true })).toBeVisible()
  await expect(dialog.getByText('01-338008-01')).toBeVisible()
  await expect(dialog.getByText('36 × TSWB262')).toBeVisible()
  // The board's Length and Line Item Notes p1 (878,571).
  const flashing = dialog.getByRole('row').filter({ hasText: 'Sidewall Flashing' })
  await expect(flashing).toContainText('120"')
  await expect(flashing).toContainText('Bent a hair tight')
})

test('the order says where it is standing, and its last location stays while packages are on it', async ({
  page
}) => {
  await page.getByRole('row').filter({ hasText: '338008' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Trim location')).toBeVisible()
  await dialog.getByRole('button', { name: /Take 101 off this order/ }).click()
  await expect(page.getByText('Location required')).toBeVisible()
})

test('a package label can be sent to the printer again', async ({ page }) => {
  const printed = await capturePrints(page)
  await page.reload()
  await page.getByRole('row').filter({ hasText: '338008' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Reprint' }).click()

  await expect.poll(printed).toEqual([expect.stringMatching(/01-338008-01.*Order 338008/)])
})
