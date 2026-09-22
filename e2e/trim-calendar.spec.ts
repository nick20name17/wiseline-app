import { expect, test } from '@playwright/test'
import { mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim?view=calendar')
  await signIn(page)
  await expect(page).toHaveURL(/view=calendar/)
})

test('the month shows how many orders each production day carries', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'September 2026' })).toBeVisible()
  // Three of the four scheduled fixtures sit on Wed, Sep 23.
  await expect(page.getByRole('button', { name: 'Wed, Sep 23, 2026' })).toContainText('3 ord')
})

test('a day opens under the month with the orders on it', async ({ page }) => {
  await page.getByRole('button', { name: 'Wed, Sep 23, 2026' }).click()

  await expect(page.getByText('3 orders scheduled')).toBeVisible()
  await expect(page.getByText('330608')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open in Scheduled' })).toBeVisible()
})

test('the day leads back to the board', async ({ page }) => {
  await page.getByRole('button', { name: 'Open in Scheduled' }).click()

  await expect(page).toHaveURL(/view=scheduled/)
})
