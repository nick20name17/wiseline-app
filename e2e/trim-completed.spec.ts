import { expect, test } from '@playwright/test'
import { mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim?view=completed')
  await signIn(page)
  await expect(page).toHaveURL(/view=completed/)
})

test('the tab lists what the department finished, newest first', async ({ page }) => {
  await expect(page.getByText('2 completed in the past 90 days')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: '338008' })
  await expect(row.getByText('Vittoria Metal Works')).toBeVisible()
  await expect(row.getByText(/Sat, Sep 19, 2026/)).toBeVisible()
  // A stock order has no customer of its own and says so.
  await expect(page.getByRole('row').filter({ hasText: 'S1039' }).getByText('Stock')).toBeVisible()
})

test('an order opens with its line items and packages', async ({ page }) => {
  await page.getByRole('row').filter({ hasText: '338008' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Completed · 338008 · Vittoria Metal Works')).toBeVisible()
  const stock = dialog.getByRole('row').filter({ hasText: 'TRAKE24' })
  await expect(stock.getByText('4', { exact: true })).toBeVisible()
  await expect(dialog.getByText('01-338008-01')).toBeVisible()
  await expect(dialog.getByText('36 × 901')).toBeVisible()
})

test('a package label can be sent to the printer again', async ({ page }) => {
  await page.getByRole('row').filter({ hasText: '338008' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Reprint' }).click()

  await expect(page.getByText('Label sent')).toBeVisible()
})
