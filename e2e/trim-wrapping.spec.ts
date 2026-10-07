import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { WRAPPING_ROWS, capturePrints, mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim?view=production')
  await signIn(page)
  await page.getByRole('tab', { name: 'Wrapping' }).click()
})

test('the station lists what is left to wrap, by production day', async ({ page }) => {
  await expect(page.getByText('Wed, September 23, 2026')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'Sidewall Flashing' })
  await expect(row.getByText('40', { exact: true }).first()).toBeVisible()
  // A remake is still owed on it, so the whole line is highlighted, not only its badge.
  await expect(row).toHaveAttribute('data-reman', 'owed')
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
  await expect(page.getByLabel('Wrap from 902')).toBeHidden()
  await expect(
    page.getByRole('row').filter({ hasText: 'Drip Edge' }).getByText('Not eligible')
  ).toBeVisible()
})

test('what is wrapped is capped by what a remake still owes, and Auto fill takes itself back', async ({
  page
}) => {
  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()

  // 40 left, 4 of them owed by an open remake.
  await page.getByLabel('Wrap from 901').fill('50')
  await expect(page.getByLabel('Wrap from 901')).toHaveValue('36')

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByLabel('Wrap from 901')).toHaveValue('')
  await page.getByRole('button', { name: 'Auto fill' }).click()
  await expect(page.getByLabel('Wrap from 901')).toHaveValue('36')
})

test('Select location waits for an amount, and the order starts where it already stands', async ({
  page
}) => {
  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()

  const select = page.getByRole('button', { name: /Select location/ })
  const create = page.getByRole('button', { name: 'Create & print' })
  await expect(select).toBeDisabled()
  await expect(create).toBeDisabled()

  await page.getByRole('button', { name: 'Auto fill' }).first().click()
  await expect(select).toHaveText(/Select location · 101/)
  await expect(create).toBeEnabled()

  await select.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Select location · Order 330608')).toBeVisible()
  // A full location is shown and shut rather than hidden.
  await expect(dialog.getByRole('button', { name: /102/ })).toBeDisabled()
  await expect(dialog.getByText(/15 min/)).toBeVisible()
})

test('a package over the location limit is printed only once the Worker says so', async ({
  page
}) => {
  const printed = await capturePrints(page)
  await page.reload()
  await page.getByRole('tab', { name: 'Wrapping' }).click()
  const sent: Record<string, unknown>[] = []
  await page.route(`${API_URL}/wrapping/packages/`, route => {
    sent.push(route.request().postDataJSON() as Record<string, unknown>)
    return route.fulfill({ json: { id: 71, name: '01-330608-01', location_id: 5, weight: 400 } })
  })

  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()
  await page.getByRole('button', { name: 'Auto fill' }).first().click()
  // 36 pieces at 11 lb are 396 lb; 101 has 380 lb left.
  await expect(page.getByLabel('Package weight')).toHaveText('396')
  await page.getByRole('button', { name: 'Create & print' }).click()

  await expect(page.getByText('Location over weight limit')).toBeVisible()
  await page.getByRole('button', { name: 'Yes, Create & Print' }).click()

  await expect.poll(() => sent[0]?.override_weight).toBe(true)
  await expect(page.getByText('Created 01-330608-01 · 36 pcs → 101')).toBeVisible()
  // The label is the browser's to print (round 8 answers, B6).
  await expect.poll(printed).toEqual([expect.stringMatching(/01-330608-01.*Location 101.*36/)])
})

test('the last location of an order with packages cannot be taken off', async ({ page }) => {
  // Something of the order is already wrapped, so its packages stand on 101.
  await page.route(`${API_URL}/wrapping/?*`, route =>
    route.fulfill({
      json: WRAPPING_ROWS.map(row =>
        row.origin_item === '901' ? { ...row, wrapped: 10, left_to_wrap: 30 } : row
      )
    })
  )
  await page.reload()
  await page.getByRole('tab', { name: 'Wrapping' }).click()
  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()
  await page.getByRole('button', { name: 'Take 101 off this order' }).click()

  await expect(page.getByText('Location required')).toBeVisible()
})

test('a damaged piece is sent back to be remade', async ({ page }) => {
  const asked: Record<string, unknown>[] = []
  await page.route(`${API_URL}/remanufacturings/request/`, route => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>)
    return route.fulfill({ json: { id: 5, order: 'ARINV-2', origin_item: '901' } })
  })

  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()

  // 901 already has one outstanding; it carries the badge and can be asked for again.
  const badge = page.getByRole('button', {
    name: 'Remanufacture history, latest 4 pcs. outstanding'
  })
  await expect(badge).toHaveText('4')
  // Each remake is listed behind the badge, with its note.
  await badge.click()
  await expect(page.getByText('Bent on the truck')).toBeVisible()
  await page.keyboard.press('Escape')
  // 902 has not been bent, so there is nothing to remake yet.
  await expect(page.getByRole('button', { name: 'Remanufacture 902' })).toBeHidden()

  const again = page.getByRole('button', { name: 'Remanufacture 901' })
  await expect(again).toHaveAttribute('title', 'Remanufacture again')
  await again.click()
  // The figure is keyed in on the floor's keypad, which opens with the window.
  const keypad = page.getByRole('dialog', { name: 'Pieces to remake' })
  await keypad.getByRole('button', { name: '3', exact: true }).click()
  await keypad.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: 'Request remake' }).click()

  await expect.poll(() => asked[0]?.quantity).toBe(3)
  await expect.poll(() => asked[0]?.source).toBe('wrapping')
})

test('Order complete is held until nothing is left to wrap', async ({ page }) => {
  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()

  await expect(page.getByRole('button', { name: 'Order complete' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Order complete' })).toHaveAttribute(
    'title',
    'Waiting on a remanufacture — available once the machine marks it Bent'
  )
})

test('See packages reprints a lost label', async ({ page }) => {
  const printed = await capturePrints(page)
  const reprinted: string[] = []
  await page.route(`${API_URL}/wrapping/orders/*/packages/`, route =>
    route.fulfill({
      json: [
        {
          package_id: 71,
          name: '01-330608-01',
          weight: 110,
          location: '101',
          is_loaded: false,
          contents: [{ origin_item: '901', quantity: 10 }]
        }
      ]
    })
  )
  await page.route(`${API_URL}/packages/*/reprint/`, route => {
    reprinted.push(new URL(route.request().url()).pathname)
    // Moved since it was packed: the label says where it stands now.
    return route.fulfill({
      json: {
        package_id: 71,
        name: '01-330608-01',
        order_number: '330608',
        location: '102',
        weight: 110,
        contents: [{ origin_item: '901', quantity: 10 }]
      }
    })
  })
  // Ten of the line are already wrapped, so there is a package to see.
  await page.route(`${API_URL}/wrapping/?*`, route =>
    route.fulfill({
      json: WRAPPING_ROWS.map(row =>
        row.origin_item === '901' ? { ...row, wrapped: 10, left_to_wrap: 30 } : row
      )
    })
  )
  await page.reload()
  await page.getByRole('tab', { name: 'Wrapping' }).click()
  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()
  await page.getByRole('button', { name: 'See packages' }).click()

  await page.getByRole('button', { name: 'Reprint label 01-330608-01' }).click()

  await expect.poll(() => reprinted).toEqual(['/packages/71/reprint/'])
  await expect.poll(printed).toEqual([expect.stringMatching(/01-330608-01.*Location 102/)])
})

test('a damaged piece is replaced from stock at the bench, on the keypad', async ({ page }) => {
  const edits: unknown[] = []
  // The bench row carries the app's own line id, which the edit goes to.
  await page.route(`${API_URL}/items/9001/`, route => {
    edits.push(route.request().postDataJSON())
    return route.fulfill({ json: {} })
  })
  await page.getByRole('row').filter({ hasText: 'Sidewall Flashing' }).click()

  await page.getByRole('button', { name: 'Stock for 901' }).click()
  const keypad = page.getByRole('dialog', { name: 'Stock for 901' })
  await keypad.getByRole('button', { name: '5', exact: true }).click()
  await keypad.getByRole('button', { name: 'Enter' }).click()

  await expect.poll(() => edits).toEqual([{ pull_from_stock: 5 }])
})
