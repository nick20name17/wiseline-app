import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim?view=production')
  await signIn(page)
  await expect(page).toHaveURL(/view=production/)
})

test('the tab opens on the Slinet with its cutlists grouped by day', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Slinet' })).toHaveAttribute('data-active', '')
  await expect(page.getByRole('tab', { name: 'Active cutlists' })).toBeVisible()

  // The date is said once, over the lists that share it.
  await expect(page.getByText('Fri, Sep 18, 2026')).toBeVisible()
  await expect(page.getByText('26ga - Charcoal').first()).toBeVisible()
  // The Slinet cuts; it has no bends and no daily max of its own.
  await expect(page.getByText('Total # Pieces')).toBeVisible()
  await expect(page.getByText('Daily Max (bends)')).toBeHidden()
})

test('a list from a day gone by is marked overdue', async ({ page }) => {
  const overdue = page.getByText('24ga - Galvalume').locator('..')
  await expect(overdue.getByText('Overdue')).toBeVisible()
})

test('the Slinet reads its list sideways — machines as columns, vented in its own', async ({
  page
}) => {
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()

  // The board's order: the machines up to the rollformer, Vented, then the rest.
  await expect(page.getByRole('columnheader')).toHaveText([
    'W"',
    'L"',
    'Total',
    'Press Brake',
    'V1',
    'V2',
    'Roll Former',
    'Vented',
    'Caps',
    'Flat Stock',
    'Operator Notes',
    'Complete'
  ])
  // 8 pieces stay on V2 and the 18 vented ones leave its column for the Vented one.
  const row = page.getByRole('row').filter({ hasText: '96"' })
  await expect(row.getByText('8', { exact: true })).toBeVisible()
  await expect(row.getByText('18', { exact: true })).toBeVisible()
})

test('a total opens the orders behind it', async ({ page }) => {
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()
  await page.getByRole('button', { name: '12', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Orders using this size')).toBeVisible()
  await expect(dialog.getByText('330608')).toBeVisible()
  await expect(dialog.getByText('Jireh Tools')).toBeVisible()
  await expect(dialog.getByText('TRC8250')).toBeVisible()
})

test('reopening a row asks first, marking one complete does not', async ({ page }) => {
  const patched: string[] = []
  page.on('request', request => {
    if (request.url().includes('/cutlists/rows/')) patched.push(request.method())
  })

  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()
  await page.getByRole('checkbox', { name: /Complete 12.5/ }).click()

  await expect.poll(() => patched).toEqual(['PATCH'])
  await expect(page.getByText('Mark this row as NOT completed?')).toBeHidden()
})

test('Done waits until every row is complete', async ({ page }) => {
  const outstanding = page.getByText('26ga - Charcoal').first().locator('..')
  await expect(outstanding.getByRole('button', { name: 'Done' })).toBeDisabled()

  const ready = page.getByText('26ga - Bright White').locator('..')
  await ready.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Mark this cutlist done?')).toBeVisible()
  await expect(page.getByText('coil adjustments')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yes', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'No', exact: true })).toBeVisible()
})

test('Cutlist Coils lists the coils this colour can be cut from', async ({ page }) => {
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Cutlist Coils' })
    .click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('37067677')).toBeVisible()
  await expect(dialog.getByText('CS488306')).toBeVisible()

  // Nothing has moved yet, so there is nothing to push.
  await expect(dialog.getByRole('button', { name: 'Apply' })).toBeDisabled()
  await dialog.getByRole('spinbutton', { name: /Thickness/ }).fill('0')
  await dialog.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('Deplete & delete coil?')).toBeVisible()
})

test('a machine tab holds its own bendlists, with its daily max', async ({ page }) => {
  await page.getByRole('tab', { name: 'Press Brake' }).click()

  await expect(page.getByRole('tab', { name: 'Active bendlists' })).toBeVisible()
  await expect(page.getByText('Daily Max (bends)')).toBeVisible()

  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', {
      name: 'Show rows'
    })
    .click()
  await expect(page.getByRole('columnheader', { name: 'Qty to Manufacture' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Remanufacture' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Vented' })).toBeHidden()
  await expect(page.getByRole('columnheader', { name: 'Operator Notes' })).toBeHidden()

  // The product's drawing sits in the row and opens full size p1 (660,539).
  await page.getByRole('button', { name: 'Drawing of TRC8250' }).first().click()
  const drawing = page.getByRole('dialog', { name: 'Drawing of TRC8250' })
  await expect(drawing.getByRole('img', { name: 'Drawing of TRC8250' })).toHaveAttribute(
    'src',
    'https://files.e2e.test/TRC8250_1.png'
  )
})

test('a machine cannot sign off a row the Slinet has not cut', async ({ page }) => {
  await page.getByRole('tab', { name: 'Press Brake' }).click()
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()

  // The Charcoal cutlist's 12.5 × 120 row for Press Brake is still outstanding.
  await expect(page.getByRole('checkbox', { name: /Complete 12.5/ })).toBeDisabled()
  await expect(page.getByTitle('Available once the Slinet starts on this release')).toBeVisible()
  await expect(page.getByText('In progress')).toBeHidden()
})

test('a bendlist stays in progress once its Slinet list is done', async ({ page }) => {
  // The Charcoal cutlist has been cut and marked Done, which is the most a Slinet list can cut.
  await page.route(`${API_URL}/cutlists/*`, route => {
    const params = new URL(route.request().url()).searchParams
    if (params.get('kind') !== 'cutlist' || params.get('completed') !== 'true')
      return void route.fallback()
    void route.fulfill({
      json: [
        {
          id: 505,
          kind: 'cutlist',
          production_date: '2026-09-23',
          gauge_color: '26ga - Charcoal',
          released_at: '2026-09-21T09:00:00',
          completed_at: '2026-09-21T16:20:00',
          is_complete: true,
          rows: []
        }
      ]
    })
  })
  await page.reload()
  await page.getByRole('tab', { name: 'Press Brake' }).click()

  await expect(page.getByText('In progress')).toBeVisible()
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()
  await expect(page.getByRole('checkbox', { name: /Complete 12.5/ })).toBeEnabled()
})

test('a machine row asks for a remanufacture against its line', async ({ page }) => {
  // The bendlist row's only line, as the board has it released.
  await page.route(`${API_URL}/wrapping/?*`, route =>
    route.fulfill({
      json: [
        {
          origin_item: '101',
          order: 'ARINV-2',
          order_number: '330608',
          description: 'Ridge Cap Dark Red',
          qty_ordered: 8
        }
      ]
    })
  )
  await page.reload()
  await page.getByRole('tab', { name: 'Press Brake' }).click()
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()
  await page.getByRole('button', { name: /Remanufacture 12.5/ }).click()

  // The keypad opens with it. Nothing on this line is waiting for a remake yet, so the whole order
  // can be asked for.
  const keypad = page.getByRole('dialog', { name: 'Pieces to remake' })
  await expect(keypad.getByText('Now 0 of 8.', { exact: false })).toBeVisible()
  await page.keyboard.press('Escape')

  const dialog = page.getByRole('dialog', { name: 'Remanufacture' })
  await expect(dialog.getByText('Ridge Cap Dark Red on order 330608')).toBeVisible()
  await expect(dialog.getByText('1–8', { exact: true })).toBeVisible()
})

test('the station and the open lists survive a trip to another tab', async ({ page }) => {
  await page.getByRole('tab', { name: 'Press Brake' }).click()
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()

  await page.getByRole('button', { name: 'Coils', exact: true }).click()
  await expect(page).toHaveURL(/view=coils/)
  await page.getByRole('tab', { name: /^Production/ }).click()

  await expect(page.getByRole('tab', { name: 'Press Brake' })).toHaveAttribute('data-active', '')
  await expect(page.getByRole('button', { name: 'Hide rows' })).toBeVisible()
})

test('the completed lists are a switch away and keep the same format', async ({ page }) => {
  await page.getByRole('tab', { name: /Completed cutlists/ }).click()

  await expect(page.getByText('26ga - Bright White')).toBeVisible()
  await expect(page.getByText('Done', { exact: true })).toBeVisible()
  // A finished list is not late and has nothing left to act on.
  await expect(page.getByRole('button', { name: 'Cutlist Coils' })).toBeHidden()

  // Its rows can still be reopened: a sign-off made by mistake is not locked in by Done.
  await page.getByRole('button', { name: 'Show rows' }).click()
  await page.getByRole('checkbox', { name: /Complete 10/ }).click()
  await expect(
    page.getByText('Are you sure you want to mark this row as NOT completed?')
  ).toBeVisible()
})
