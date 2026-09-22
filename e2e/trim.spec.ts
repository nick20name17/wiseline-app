import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim')
  await signIn(page)
  await expect(page).toHaveURL(/\/trim/)
})

test('the board lists unscheduled orders with the day strip and the tab count', async ({
  page
}) => {
  // The page is named once, in the trail at the top; the board itself carries no title.
  await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toContainText('Trim')
  await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toContainText('Unscheduled')
  // The tab carries the count; the toolbar says nothing until something is ticked.
  await expect(page.getByRole('tab', { name: 'Unscheduled 2' })).toBeVisible()

  // The day pill carries the bends scheduled against its machines' daily max added up — five
  // benders at 1200 — not the 5000 the day strip itself returns.
  await expect(page.getByText('(1000 / 6000)').first()).toBeVisible()

  await expect(page.getByText('330605')).toBeVisible()
  await expect(page.getByText('H F H Inc')).toBeVisible()
  // A stock order shows its own badge and no order note.
  await expect(page.getByText('S1041')).toBeVisible()
  await expect(page.getByText('Stock', { exact: true }).first()).toBeVisible()
})

test('expanding an order shows its line items and offers a split', async ({ page }) => {
  await page.getByText('330605').click()

  await expect(page.getByText('Ridge Cap Dark Red')).toBeVisible()
  await expect(page.getByText('Eave Drip Dark Red')).toBeVisible()

  const split = page.getByRole('button', { name: /Split & schedule/ })
  await expect(split).toBeDisabled()

  await page.getByLabel('Select line item TRC8250').click()
  await expect(split).toBeEnabled()
  await expect(page.getByText('1 line item picked', { exact: false })).toBeVisible()
})

test('ticking an order enables Schedule and Bypass Production', async ({ page }) => {
  const schedule = page.getByRole('button', { name: /^Schedule/ })
  const bypass = page.getByRole('button', { name: /^Bypass Production/ })
  await expect(schedule).toBeDisabled()
  await expect(bypass).toBeDisabled()

  await page.getByLabel('Select order 330605').click()

  await expect(page.getByText('1 selected')).toBeVisible()
  await expect(schedule).toBeEnabled()
  await expect(bypass).toBeEnabled()

  await schedule.click()
  await expect(page.getByRole('heading', { name: 'Set production date' })).toBeVisible()
  await expect(page.getByText('Scheduling 1 order entirely.')).toBeVisible()
})

test('the priority list offers only this department’s priorities', async ({ page }) => {
  await page.getByRole('button', { name: 'Set priority' }).first().click()

  await expect(page.getByRole('menuitemradio', { name: 'Rush' })).toBeVisible()
  await expect(page.getByRole('menuitemradio', { name: 'Standard' })).toBeVisible()
  await expect(page.getByRole('menuitemradio', { name: 'Rollforming only' })).toHaveCount(0)
})

test('an unread order note opens and can be acknowledged', async ({ page }) => {
  let marked = false
  await page.route(`${API_URL}/orders/ARINV-1/note/read/`, route => {
    marked = true
    void route.fulfill({ json: { order: 'ARINV-1', has_note: true, read: true } })
  })

  await page.getByRole('button', { name: 'Order notes' }).click()

  await expect(page.getByText('Would like this order by 4:30 tomorrow')).toBeVisible()
  await expect(page.getByText('Henry Wall')).toBeVisible()

  await page.getByRole('button', { name: 'Mark dealt with' }).click()
  await expect.poll(() => marked).toBe(true)
})
