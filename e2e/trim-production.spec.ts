import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { BENDLIST, mockTrimApi, signIn } from './trim-api.ts'

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
  // The server's row for the Slinet: the day's pieces, what of them is cut, against its piece cap.
  await expect(page.getByText('18 / 24', { exact: true })).toBeVisible()
  await expect(page.getByText('2 / 4 50%', { exact: true })).toBeVisible()
  await expect(page.getByText('24 / 1,200', { exact: true })).toBeVisible()
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
  await expect(dialog.getByText('Ridge Cap Dark Red')).toBeVisible()
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

  // Nothing has moved yet, so there is nothing to push.
  await expect(dialog.getByRole('button', { name: 'Apply' })).toBeDisabled()
  // The thickness is typed on the keypad, decimals included p1 (486,399).
  await dialog.getByRole('button', { name: 'Thickness in inches, coil 37067677' }).click()
  const keypad = page.getByRole('dialog', { name: /Coil Thickness/ })
  for (const key of ['0', '.', '5'])
    await keypad.getByRole('button', { name: key, exact: true }).click()
  await expect(keypad.getByText('→ 0.5 in.')).toBeVisible()
  await keypad.getByRole('button', { name: 'Clear' }).click()
  await keypad.getByRole('button', { name: '0', exact: true }).click()
  await keypad.getByRole('button', { name: 'Enter' }).click()
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
  // The row fits a touchscreen whole: what the bender reads now and then opens from the row.
  await expect(page.getByRole('columnheader', { name: 'Complete' })).toBeInViewport()
  await expect(page.getByRole('columnheader', { name: 'Remanufacture' })).toBeHidden()
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
  // The bendlist row's only line, as the board has it released and the Slinet has cut it.
  await page.route(`${API_URL}/wrapping/?*`, route =>
    route.fulfill({
      json: [
        {
          origin_item: '101',
          order: 'ARINV-2',
          order_number: '330608',
          description: 'Ridge Cap Dark Red',
          qty_ordered: 8,
          // Nothing uncut can be spoiled, so a remake waits for the Slinet.
          status: 'cut'
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
  // A tap on the row opens what does not fit on it.
  await page.getByRole('cell', { name: 'Ridge Cap Dark Red' }).first().click()
  const details = page.getByRole('dialog', { name: /TRC8250/ })
  await expect(details.getByText('Ridge Cap Dark Red')).toBeVisible()
  await page.keyboard.press('Escape')
  // Remanufacture sits on the row, as it does at Wrapping.
  await page
    .getByRole('button', { name: /Remanufacture 12.5/ })
    .first()
    .click()

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

test('a Slinet list shows the coil in the machine and how many more could go on', async ({
  page
}) => {
  const asked: string[][] = []
  await page.route(`${API_URL}/coils/cutlist-summary/*`, route => {
    const ids = new URL(route.request().url()).searchParams.getAll('ids')
    asked.push(ids)
    return route.fulfill({
      json: ids.map(id => ({
        cutlist_id: Number(id),
        available: 3,
        linear_feet: 7579,
        in_trim: 2,
        in_rollforming: 1,
        elsewhere: 0,
        locations: [{ location: 'T-1', coils: 2 }]
      }))
    })
  })
  await page.reload()

  await expect(page.getByText('37067677 (1,533 ft)').first()).toBeVisible()
  // Kevin's notes of 2026-11-02 (A10): count, feet, departments — the locations are left off.
  await expect(page.getByText('3 - (7,579 ft) 2 - Trim, 1 - Rollforming').first()).toBeVisible()
  // Every list of the day in one request.
  expect(asked).toHaveLength(1)
})

test('the totals count another day once it is picked, and Today brings them back', async ({
  page
}) => {
  await expect(page.getByText('today', { exact: true })).toBeVisible()
  const asked = page.waitForRequest(request =>
    request.url().includes('machine-capacities/?day=2026-09-24')
  )
  await page.getByRole('button', { name: 'Tue, Sep 22, 2026' }).click()
  await page.getByRole('button', { name: /September 24th, 2026/ }).click()
  await asked

  await expect(page.getByRole('button', { name: 'Thu, Sep 24, 2026' })).toBeVisible()
  // The calendar's own today is named «Today, Tuesday, …».
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Tue, Sep 22, 2026' })).toBeVisible()
  await expect(page.getByText('today', { exact: true })).toBeVisible()
})

test('a bendlist row says what was ordered and pulled, and Stock opens the keypad from the row', async ({
  page
}) => {
  // Two orders cut as one row: 20 + 6 ordered, 8 of them off the shelf, 18 to make.
  const line = (item_id: number, order_number: string, qty_ordered: number, pull: number) => ({
    ...BENDLIST.rows[0]!.sources[0]!,
    item_id,
    order: `ARINV-${item_id}`,
    order_number,
    origin_item: String(item_id),
    quantity: qty_ordered - pull,
    qty_ordered,
    pull_from_stock: pull
  })
  const row = {
    ...BENDLIST.rows[0]!,
    quantity: 18,
    sources: [line(7001, '330608', 20, 8), line(7002, '330611', 6, 0)]
  }
  await page.route(`${API_URL}/cutlists/?*kind=bendlist*`, route =>
    route.fulfill({
      json:
        new URL(route.request().url()).searchParams.get('completed') === 'true'
          ? []
          : [{ ...BENDLIST, rows: [row] }]
    })
  )
  const edits: { path: string; body: unknown }[] = []
  await page.route(`${API_URL}/items/*/`, route => {
    edits.push({
      path: new URL(route.request().url()).pathname,
      body: route.request().postDataJSON()
    })
    return route.fulfill({ json: {} })
  })
  await page.reload()
  await page.getByRole('tab', { name: 'Press Brake' }).click()
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()

  const headers = page.getByRole('columnheader')
  await expect(headers.nth(2)).toHaveText('Qty Ordered')
  await expect(headers.nth(3)).toHaveText('Stock')
  await expect(headers.nth(4)).toHaveText('Qty to Manufacture')
  const bendRow = page.getByRole('row').filter({ hasText: '12.5' })
  await expect(bendRow.getByRole('cell').nth(2)).toHaveText('26')

  // Several orders on the row: whose stock comes first, then the keypad, with no details between.
  await bendRow.getByRole('button', { name: 'Stock for 12.5 × 120' }).click()
  await page.getByRole('menuitem', { name: /330611/ }).click()
  const keypad = page.getByRole('dialog', { name: 'Stock for 330611' })
  await keypad.getByRole('button', { name: '2', exact: true }).click()
  await keypad.getByRole('button', { name: 'Enter' }).click()

  // The bendlist's machine goes with the edit, which the server logs a spoiled piece against.
  await expect
    .poll(() => edits)
    .toEqual([{ path: '/items/7002/', body: { pull_from_stock: 2, from_flow: 1 } }])
})

test('a list changed on another screen is read again when the counts socket says so', async ({
  page
}) => {
  let push: (message: unknown) => void = () => {}
  await page.routeWebSocket(`${API_URL.replace('https', 'wss')}/ws/counts/`, socket => {
    push = message => socket.send(JSON.stringify(message))
  })
  const read: string[] = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (request.method() === 'GET' && url.pathname === '/cutlists/')
      read.push(url.searchParams.get('department_id') ?? '')
  })
  await page.reload()
  await expect(page.getByText('26ga - Charcoal').first()).toBeVisible()
  const before = read.length

  // Another department's lists leave this board's alone.
  push({ cutlists_changed: { '2': [40] } })
  push({ cutlists_changed: { '1': [10] } })
  await expect.poll(() => read.slice(before)).toContain('1')
  expect(read.slice(before)).not.toContain('2')
})
