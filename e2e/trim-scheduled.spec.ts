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
  await expect(page.getByRole('tab', { name: 'Scheduled 3' })).toBeVisible()
  await expect(page.getByText('330608')).toBeVisible()
  await expect(page.getByText('Jireh Tools')).toBeVisible()
  await expect(page.getByText('S1042')).toBeVisible()
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
  await expect(page.getByText('Stock orders locked')).toBeVisible()
  await expect(stock).toBeDisabled()
})

test('releasing sends the ticked orders and reports the cutlists', async ({ page }) => {
  let released: number[] = []
  await page.route(`${API_URL}/departments/1/release/`, async route => {
    released = JSON.parse(route.request().postData() ?? '{}').sales_order_ids
    await route.fulfill({ json: { released, department_id: 1, cutlists: [7, 8] } })
  })

  const button = page.getByRole('button', { name: /^Release to production/ })
  await expect(button).toBeDisabled()

  await page.getByLabel('Select order 330608 for release').click()
  await expect(button).toBeEnabled()
  await button.click()

  await expect.poll(() => released).toEqual([21])
  await expect(page.getByText('2 cutlists generated')).toBeVisible()
})

test('the day tab gear opens the machine capacities for that day', async ({ page }) => {
  await page
    .getByRole('button', { name: /Machine capacities for/ })
    .first()
    .click()

  await expect(page.getByRole('heading', { name: 'Machine capacities' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Press Brake' })).toBeVisible()
  // The bracket is what the board shows: how much of the total comes from stock.
  await expect(page.getByText('(4 — Stock)')).toBeVisible()
})

test('Allocated Stock reports what reviewed orders draw from stock', async ({ page }) => {
  await page.getByRole('button', { name: 'Allocated Stock' }).click()

  await expect(page.getByRole('heading', { name: 'Allocated stock' })).toBeVisible()
  await expect(page.getByText('Charcoal', { exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'TSG8306' })).toBeVisible()
})

test('expanding a scheduled order offers the machine, stock and vented columns', async ({
  page
}) => {
  await page.getByText('330615').click()

  await expect(page.getByRole('columnheader', { name: 'Machine' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Vented' })).toBeVisible()
  await expect(page.getByLabel('Vent TED8250')).toBeVisible()
  await expect(page.getByLabel('Machine for TED8250')).toHaveText(/Assign/)
})
