import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim?view=scheduled')
  await signIn(page)
  await expect(page).toHaveURL(/view=scheduled/)
  // The board opens on today; these fixtures sit on their own day, so widen to the whole list.
  await page.getByRole('button', { name: /All Scheduled Orders/ }).click()
})

test('the tab lists scheduled orders by day with their capacity', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Scheduled 4' })).toBeVisible()
  await expect(page.getByText('330608')).toBeVisible()
  await expect(page.getByText('Jireh Tools')).toBeVisible()
  await expect(page.getByText('S1042')).toBeVisible()
  // On the whole list the count names what it counts; a day tab names the day instead.
  await expect(page.getByText('4 scheduled orders')).toBeVisible()
})

test('a past-due order is marked across its whole row', async ({ page }) => {
  const row = page.getByRole('row').filter({ hasText: '338009' })
  await expect(row).toHaveAttribute('data-overdue', 'true')
  await expect(row.getByLabel('Past due')).toBeVisible()
})

test('an order without every machine assigned cannot be reviewed', async ({ page }) => {
  // 330615 has a line with no machine, so its toggle is held and says which gate is holding it.
  await expect(page.getByLabel('Reviewed 330615')).toBeDisabled()
  await expect(page.getByText('assign machines')).toBeVisible()
  // 330608 is already reviewed, so its release checkbox is there instead of a dash.
  await expect(page.getByLabel('Select order 330608 for release')).toBeVisible()
})

test('a release is either stock orders or customer orders, never both', async ({ page }) => {
  const customer = page.getByLabel('Select order 330608 for release')
  const stock = page.getByLabel('Select order S1042 for release')
  await expect(stock).toBeEnabled()

  await customer.click()

  await expect(page.getByText('1 customer order selected for release')).toBeVisible()
  await expect(page.getByText('Stock orders locked (type exclusion)')).toBeVisible()
  await expect(stock).toBeDisabled()
})

test('releasing sends the ticked orders and reports the cutlists', async ({ page }) => {
  let released: unknown = []
  await page.route(`${API_URL}/departments/1/release/`, async route => {
    released = JSON.parse(route.request().postData() ?? '{}').days
    await route.fulfill({ json: { released: [21], department_id: 1, cutlists: [7, 8] } })
  })

  const button = page.getByRole('button', { name: /^Release to production/ })
  await expect(button).toBeDisabled()

  await page.getByLabel('Select order 330608 for release').click()
  await expect(button).toBeEnabled()
  await button.click()

  // A part is one day of an order, released on its own p1 (335,505).
  await expect.poll(() => released).toEqual([{ sales_order_id: 21, production_date: '2026-09-23' }])
  await expect(page.getByText('Released 1 order · 2 cutlists generated')).toBeVisible()
})

test('turning Reviewed off asks first', async ({ page }) => {
  await page.getByLabel('Reviewed 330608').click()

  await expect(page.getByRole('heading', { name: 'Turn off Reviewed?' })).toBeVisible()
  await expect(
    page.getByText('Order 330608 on Wed, Sep 23, 2026 will no longer be selectable for release.')
  ).toBeVisible()
})

test('Reviewed belongs to the part’s own day', async ({ page }) => {
  let url = ''
  await page.route(`${API_URL}/sales-orders/21/departments/1/?*`, async route => {
    url = route.request().url()
    await route.fulfill({ json: {} })
  })

  await page.getByLabel('Reviewed 330608').click()
  await page.getByRole('button', { name: 'Confirm' }).click()

  await expect
    .poll(() => new URL(url || 'http://x').searchParams.get('production_date'))
    .toBe('2026-09-23')
})

test('rescheduling moves only the lines on the part’s own day', async ({ page }) => {
  let moved: string[] = []
  await page.route(`${API_URL}/sales-orders/21/departments/1/schedule/`, async route => {
    moved = JSON.parse(route.request().postData() ?? '{}').origin_items
    await route.fulfill({ json: {} })
  })

  await page
    .getByRole('row')
    .filter({ hasText: '330608' })
    .getByTitle('Change production day (pre-release)')
    .click()

  await expect(page.getByRole('heading', { name: 'Reschedule order 330608' })).toBeVisible()
  await expect(
    page.getByText('Pick any production day. Rescheduling resets Manager edits.')
  ).toBeVisible()
  // The calendar opens on the part's own day, already picked.
  await page.getByRole('button', { name: 'Reschedule', exact: true }).click()

  await expect.poll(() => moved).toEqual(['101'])
  await expect(page.getByText(/^Rescheduled to .* — Manager edits reset$/)).toBeVisible()
})

test('a scheduled order can be sent back to Unscheduled from its reschedule dialog', async ({
  page
}) => {
  let unscheduled = false
  await page.route(`${API_URL}/sales-orders/21/departments/1/unschedule/`, async route => {
    unscheduled = true
    await route.fulfill({ json: {} })
  })

  await page
    .getByRole('row')
    .filter({ hasText: '330608' })
    .getByTitle('Change production day (pre-release)')
    .click()
  await page.getByRole('button', { name: 'Unschedule' }).click()

  await expect(page.getByRole('heading', { name: 'Unschedule order 330608?' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirm' }).click()

  await expect.poll(() => unscheduled).toBe(true)
  await expect(page.getByText('Order 330608 unscheduled — Manager edits reset')).toBeVisible()
})

test('the day tab gear opens the machine capacities for that day', async ({ page }) => {
  await page
    .getByRole('button', { name: /Machine capacities for/ })
    .first()
    .click()

  await expect(page.getByRole('heading', { name: 'Machine Capacities' })).toBeVisible()
  // The day's own row sits above the machines, and each row is named by its header cell.
  await expect(page.getByRole('rowheader', { name: /Press Brake/ })).toBeVisible()
  // The bracket is what the board shows: how much of the total comes from stock.
  await expect(page.getByText('(4 - Stock)')).toBeVisible()
})

test('Allocated Stock reports what reviewed orders draw from stock', async ({ page }) => {
  await page.getByRole('button', { name: 'Allocated Stock' }).click()

  await expect(page.getByRole('heading', { name: 'Allocated stock' })).toBeVisible()
  await expect(page.getByText('Charcoal', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('cell', { name: 'TSG8306' })).toBeVisible()
})

test('expanding a scheduled order offers the machine, stock and vented columns', async ({
  page
}) => {
  await page.getByText('330615').click()

  await expect(page.getByRole('columnheader', { name: 'Machine' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Stock' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Vented' })).toBeVisible()
  await expect(page.getByLabel('Vent TED8250')).toBeVisible()
  await expect(page.getByLabel('Machine for TED8250')).toHaveText(/Assign/)
})

test('the capacities report prints on its own sheet', async ({ page }) => {
  await page
    .getByRole('button', { name: /Machine capacities for/ })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: 'Machine Capacities' })).toBeVisible()

  await page.emulateMedia({ media: 'print' })

  // The report is all that reaches the paper, and it is no longer a centred panel on it.
  await expect(page.getByRole('link', { name: 'Settings' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden()
  await expect(page.getByRole('rowheader', { name: /Press Brake/ })).toBeVisible()

  // The sheet centres itself by translating half its width; on paper that would push it off the
  // page, so the offset is taken out at the property the utility feeds it from.
  const placement = await page.locator('[data-print-report]').evaluate(element => {
    const style = getComputedStyle(element)
    return { position: style.position, translateX: style.getPropertyValue('--tw-translate-x') }
  })
  expect(placement).toEqual({ position: 'static', translateX: '0' })
})
