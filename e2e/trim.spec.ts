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
  // The tab carries the count, and so does the toolbar until something is ticked.
  await expect(page.getByRole('tab', { name: 'Unscheduled 2' })).toBeVisible()
  await expect(page.getByText('2 unscheduled orders')).toBeVisible()

  // The day pill carries the bends scheduled against the capacity the day strip returns.
  await expect(page.getByText('(1000 / 5000)').first()).toBeVisible()

  await expect(page.getByText('330605')).toBeVisible()
  await expect(page.getByText('H F H Inc')).toBeVisible()
  // A stock order names itself where the customer would be, and carries no order note.
  await expect(page.getByText('S1041')).toBeVisible()
  await expect(page.getByText('Stock', { exact: true }).first()).toBeVisible()
})

test('expanding an order shows its line items and offers a split', async ({ page }) => {
  // The expander is a button of its own, so the keyboard reaches it too.
  const expander = page
    .getByRole('row')
    .filter({ hasText: '330605' })
    .getByRole('button', { name: 'Toggle details' })
  await expander.press('Enter')
  await expect(expander).toHaveAttribute('aria-expanded', 'true')

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

test('Bypass Production asks first and reports where the order went', async ({ page }) => {
  await page.route(`${API_URL}/sales-orders/11/departments/1/bypass/`, route =>
    route.fulfill({ json: {} })
  )

  await page.getByLabel('Select order 330605').click()
  await page.getByRole('button', { name: /^Bypass Production/ }).click()

  await expect(
    page.getByRole('heading', { name: 'Bypass Production — order 330605?' })
  ).toBeVisible()
  await expect(
    page.getByText(
      'Are you sure you want this order(s) to bypass all the production tabs and go straight to the wrapping stage?'
    )
  ).toBeVisible()
  await page.getByRole('button', { name: 'Yes, Bypass Production' }).click()

  await expect(page.getByText(/^Bypassed 1 order to Wrapping · Production Date /)).toBeVisible()
})

test('the priority list offers only this department’s priorities', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Set priority' }).first().click()

  await expect(page.getByRole('option', { name: 'Rush' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Standard' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Rollforming only' })).toHaveCount(0)
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

test('what is left of a split order is scheduled like any other order', async ({ page }) => {
  // 330700 had one of its two lines split off to Sep 23; Unscheduled hands over the one left.
  const partial = {
    id: 'ARINV-9',
    invoice: '330700',
    customer: 'Jireh Tools',
    crea_date: '2024-05-06',
    ship_date: '2024-05-09',
    count_items: 2,
    total_weight: 40,
    sales_order: {
      id: 31,
      order: 'ARINV-9',
      is_stock: false,
      department_states: [{ id: 41, department: 1, production_date: '2026-09-23' }]
    },
    origin_items: [
      {
        id: 'DET-9',
        category: 'Trim',
        id_inven: 'TGD8250',
        description: 'Gable Drip Dark Red',
        quantity: 4,
        width: 6,
        length: 120,
        bends: 2,
        weight: 20,
        production_date: null,
        item: null
      }
    ]
  }
  await page.route(`${API_URL}/ebms/orders/*`, route => {
    const scheduled = new URL(route.request().url()).searchParams.get('is_scheduled') === 'true'
    return route.fulfill({
      json: scheduled ? { count: 0, results: [] } : { count: 1, results: [partial] }
    })
  })
  // The server dates only the lines with no day yet, so the part on Sep 23 stays there.
  const scheduled: unknown[] = []
  await page.route(`${API_URL}/sales-orders/schedule/`, route => {
    scheduled.push(route.request().postDataJSON())
    return route.fulfill({ json: {} })
  })
  await page.reload()

  await page.getByLabel('Select order 330700').click()
  await page.getByRole('button', { name: /^Schedule/ }).click()
  await page.getByRole('button', { name: /September 24th, 2026/ }).click()
  await page.getByRole('button', { name: 'Set date' }).click()

  await expect
    .poll(() => scheduled)
    .toEqual([{ department: 1, orders: [31], production_date: '2026-09-24' }])
})
