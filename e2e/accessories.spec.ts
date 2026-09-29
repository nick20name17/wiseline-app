import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

// The board's fixtures under the Accessories department: the same flow, its own vocabulary.
test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.route(`${API_URL}/departments/all/`, route =>
    route.fulfill({ json: [{ id: 1, name: 'Accessories', code: 'accessories' }] })
  )
  await page.route(`${API_URL}/departments/1/packaging/`, route =>
    route.fulfill({
      json: [
        {
          order: 'ARINV-2',
          order_number: '330608',
          customer: 'Jireh Tools',
          prep_date: '2026-09-23',
          priority: null,
          truck: 'N/A',
          ship_via: 'Pickup',
          status: 'not_started'
        }
      ]
    })
  )
})

test('Accessories has Packaging where Trim has Production and Coils', async ({ page }) => {
  await page.goto('/accessories')
  await signIn(page)

  const strip = page.getByRole('tablist').first()
  await expect(strip.getByRole('tab', { name: /Packaging/ })).toBeVisible()
  await expect(strip.getByRole('tab', { name: /Production/ })).toBeHidden()
  await expect(strip.getByRole('tab', { name: /Coils/ })).toBeHidden()
  // Nothing is made here, so nothing is stocked, carded or bypassed p3 (1032,232).
  await expect(page.getByRole('button', { name: 'Stock Cards' })).toBeHidden()
  await expect(page.getByRole('button', { name: /Bypass Production/ })).toBeHidden()
  await expect(page.getByRole('columnheader', { name: 'Ship Via' })).toBeVisible()
})

test('the Scheduled tab works by Prep Date, with nothing to review or release', async ({
  page
}) => {
  await page.goto('/accessories?view=scheduled')
  await signIn(page)
  await page.getByRole('button', { name: /^All Scheduled Orders/ }).click()

  await expect(page.getByRole('columnheader', { name: 'Prep Date' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Accessories Location' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Reviewed' })).toBeHidden()
  await expect(page.getByRole('button', { name: /Release to production/ })).toBeHidden()
  // No machines, so no machine report on a day.
  await expect(page.getByRole('button', { name: /^Machine capacities for/ })).toHaveCount(0)
})

test('an order on the Packaging list opens its bench in packaging words', async ({ page }) => {
  await page.goto('/accessories?view=packaging')
  await signIn(page)

  const order = page.getByRole('row', { name: 'Package 330608' })
  // «If the order is a Pick-up, then the Truck column would just automatically be assigned N/A».
  await expect(order).toContainText('N/A')
  await order.click()

  await expect(page.getByRole('button', { name: 'Back to Packaging' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Left to package' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Remanufacture' })).toBeHidden()
  await expect(page.getByLabel('Package from 901')).toBeVisible()
})
