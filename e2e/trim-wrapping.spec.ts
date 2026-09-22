import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim?view=production')
  await signIn(page)
  await page.getByRole('tab', { name: 'Wrapping' }).click()
})

test('the station lists what is left to wrap, by production day', async ({ page }) => {
  await expect(page.getByText('Wed, Sep 23, 2026')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'Sidewall Flashing' })
  await expect(row.getByText('40', { exact: true }).first()).toBeVisible()
  // It carries no cutlists, so no Active/Completed switch and no capacity strip.
  await expect(page.getByRole('tab', { name: /Active/ })).toBeHidden()
  await expect(page.getByText('Total # Pieces')).toBeHidden()
})

test('an order opens at the bench, and a line that is not made cannot be wrapped', async ({
  page
}) => {
  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()

  await expect(page.getByText('0 / 60 wrapped')).toBeVisible()
  await expect(page.getByLabel('Wrap from 901')).toBeEnabled()
  await expect(page.getByLabel('Wrap from 902')).toBeDisabled()
})

test('Create & print waits for a location and something to put in the package', async ({
  page
}) => {
  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()

  const create = page.getByRole('button', { name: 'Create & print' })
  await expect(create).toBeDisabled()

  await page.getByRole('button', { name: 'Auto fill' }).first().click()
  await expect(create).toBeDisabled()

  await page.getByRole('button', { name: 'Select location' }).click()
  // A full location is shown and shut rather than hidden.
  await expect(page.getByRole('button', { name: /102/ })).toBeDisabled()
  await page.getByRole('button', { name: /101/ }).first().click()
  await expect(create).toBeEnabled()
})

test('a damaged piece is sent back to be remade', async ({ page }) => {
  const asked: Record<string, unknown>[] = []
  await page.route(`${API_URL}/remanufacturings/request/`, route => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>)
    return route.fulfill({ json: { id: 5, order: 'ARINV-2', origin_item: '902' } })
  })

  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()

  // 901 already has one outstanding, so it carries the badge rather than the ask.
  await expect(page.getByTitle('Bent on the truck')).toHaveText('4')

  await page.getByRole('button', { name: 'Remanufacture 902' }).click()
  await page.getByLabel('Pieces to remake').fill('3')
  await page.getByRole('button', { name: 'Request remake' }).click()

  await expect.poll(() => asked[0]?.quantity).toBe(3)
  await expect.poll(() => asked[0]?.source).toBe('wrapping')
})

test('Order complete is held until nothing is left to wrap', async ({ page }) => {
  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()

  await expect(page.getByRole('button', { name: 'Order complete' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Order complete' })).toHaveAttribute(
    'title',
    /1 line item\(s\) still have pieces left to wrap/
  )
})
