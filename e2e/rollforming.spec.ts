import { expect, test, type Page } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { SCHEDULED_ORDERS, WRAPPING_ROWS, capturePrints, mockTrimApi, signIn } from './trim-api.ts'

// The board's fixtures under the Rollforming department: its tabs, and the coil a line is rolled from.
let posted: { path: string; body: unknown }[]

type Line = (typeof SCHEDULED_ORDERS)[number]['origin_items'][number]

// Every line rolls on the fixtures' Roll Former (4), the one machine tab; `patch` changes a line's own row.
const onRollFormer = (patch: (line: Line) => Record<string, unknown> = () => ({})) =>
  SCHEDULED_ORDERS.map(order => ({
    ...order,
    origin_items: order.origin_items.map(line => ({
      ...line,
      machine_id: 4,
      item: line.item && { ...line.item, ...patch(line) }
    }))
  }))

const serveOrders = (page: Page, orders: unknown[]) =>
  page.route(`${API_URL}/ebms/orders/*`, route =>
    route.fulfill({ json: { count: orders.length, results: orders } })
  )

test.beforeEach(async ({ page }) => {
  posted = []
  await mockAuthApi(page)
  await mockTrimApi(page)
  await serveOrders(page, onRollFormer())
  await page.route(`${API_URL}/departments/all/`, route =>
    route.fulfill({ json: [{ id: 1, name: 'Rollforming', code: 'rollforming' }] })
  )
  await page.route(`${API_URL}/slit-line/?*`, route => {
    const done = new URL(route.request().url()).searchParams.get('slit') === 'true'
    return route.fulfill({
      json: done
        ? []
        : [
            {
              origin_item: '101',
              icon: 'waiting_to_slit',
              locked: true,
              supplier: 'waiting...',
              coil_number: 'waiting...'
            }
          ]
    })
  })
  await page.route(`${API_URL}/coil-assignment/102/coils/`, route =>
    route.fulfill({ json: [{ product_id: 'CS8250', description: 'Dark Red coil', width: 40.875 }] })
  )
  await page.route(`${API_URL}/coil-assignment/102/suppliers/`, route =>
    route.fulfill({ json: [{ supplier: 'COLSTE' }, { supplier: 'SAMSUNG' }] })
  )
  await page.route(`${API_URL}/coil-assignment/coils/CS8250/lots/`, route =>
    route.fulfill({ json: [{ coil_number: 'F7601268', on_hand: 4398.06 }] })
  )
  for (const path of [
    'coil-assignment/assign/',
    'slit-line/request/',
    'slit-line/cancel/',
    'slit-line/mark-slit/',
    'slit-line/schedule/',
    'coil-assignment/fill-in/'
  ])
    await page.route(`${API_URL}/${path}`, route => {
      posted.push({ path, body: route.request().postDataJSON() })
      return route.fulfill({ json: [] })
    })
})

test('Rollforming has its own tabs, split by machine, and no stock cards or bypass', async ({
  page
}) => {
  await page.goto('/rollforming')
  await signIn(page)

  const strip = page.getByRole('tablist').first()
  await expect(strip.getByRole('tab', { name: /Wrapping/ })).toBeVisible()
  await expect(strip.getByRole('tab', { name: /Production/ })).toBeVisible()
  await expect(strip.getByRole('tab', { name: /Queue/ })).toBeVisible()
  // The Slit Line closes the machine row instead p2 (1204,296).
  await expect(strip.getByRole('tab', { name: /Slit Line/ })).toBeHidden()
  // The second row: a tab per rollformer p2 (542,280), and the lines no machine takes.
  const machines = page.getByRole('tablist').nth(1)
  await expect(machines.getByRole('tab', { name: 'Roll Former' })).toBeVisible()
  await expect(machines.getByRole('tab', { name: 'No machine' })).toBeVisible()
  await expect(machines.getByRole('tab', { name: 'Slit Line' })).toBeVisible()
  await expect(machines.getByRole('tab', { name: 'Press Brake' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Stock Cards' })).toBeHidden()
  await expect(page.getByRole('button', { name: /Bypass Production/ })).toBeHidden()
})

test('the tab the Slit Line was opened from leads back to it', async ({ page }) => {
  await page.goto('/rollforming?view=scheduled')
  await signIn(page)
  await page.getByRole('tablist').nth(1).getByRole('tab', { name: 'Slit Line' }).click()
  await expect(page).toHaveURL(/view=slit/)

  // Scheduled stays lit above the Slit Line, so a click on it reports no change of tab.
  const scheduled = page
    .getByRole('tablist')
    .first()
    .getByRole('tab', { name: /Scheduled/ })
  await expect(scheduled).toHaveAttribute('aria-selected', 'true')
  await scheduled.click()
  await expect(page).toHaveURL(/view=scheduled/)
})

test('a line gets a Supplier and a Coil Number picked from its coil’s lots', async ({ page }) => {
  await page.goto('/rollforming?view=scheduled')
  await signIn(page)
  await page.getByRole('button', { name: /^All Scheduled Orders/ }).click()
  await page
    .getByRole('row', { name: /330615/ })
    .getByRole('button')
    .first()
    .click()

  // No machine to assign on this board: the machine comes from the profile in EBMS.
  await expect(page.getByRole('columnheader', { name: 'Machine' })).toBeHidden()
  await page.getByRole('checkbox', { name: 'Select TED8250' }).click()
  await page.getByRole('button', { name: /Select Supplier \/ Coil Number \(1\)/ }).click()

  const dialog = page.getByRole('dialog', { name: 'Select Supplier / Coil Number' })
  // A Coil Number waits on a Supplier p2 (709,459).
  await expect(dialog.getByLabel('Coil Number')).toBeDisabled()
  await expect(dialog.getByText('Pick a Supplier first.')).toBeVisible()
  await dialog.getByLabel('Supplier').click()
  await page.getByRole('option', { name: 'COLSTE' }).click()
  await dialog.getByRole('button', { name: /CS8250/ }).click()
  await dialog.getByRole('button', { name: /F7601268/ }).click()
  await expect(dialog.getByLabel('Coil Number')).toHaveValue('F7601268')
  await dialog.getByRole('button', { name: 'Assign' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual([
    {
      path: 'coil-assignment/assign/',
      body: { origin_items: ['102'], supplier: 'COLSTE', coil_number: 'F7601268' }
    }
  ])
})

test('units of a line take a coil of their own, one line per coil', async ({ page }) => {
  await page.goto('/rollforming?view=scheduled')
  await signIn(page)
  await page.getByRole('button', { name: /^All Scheduled Orders/ }).click()
  await page
    .getByRole('row', { name: /330615/ })
    .getByRole('button')
    .first()
    .click()

  // Qty lines of 1 under the order line p2 (679,416).
  await page.getByRole('button', { name: 'Units of TED8250' }).click()
  await page.getByRole('checkbox', { name: 'Select unit 2 of TED8250' }).click()
  await page.getByRole('checkbox', { name: 'Select unit 3 of TED8250' }).click()
  await page.getByRole('button', { name: /Select Supplier \/ Coil Number \(1\)/ }).click()

  const dialog = page.getByRole('dialog', { name: 'Select Supplier / Coil Number' })
  await dialog.getByLabel('Supplier').click()
  await page.getByRole('option', { name: 'SAMSUNG' }).click()
  await dialog.getByLabel('Coil Number').fill('J46A211')
  await dialog.getByRole('button', { name: 'Assign' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual([
    {
      path: 'coil-assignment/assign/',
      body: {
        origin_items: ['102'],
        supplier: 'SAMSUNG',
        coil_number: 'J46A211',
        units: { '102': [2, 3] }
      }
    }
  ])
})

test('a unit with a coil of its own shows under its line', async ({ page }) => {
  await serveOrders(
    page,
    onRollFormer(line =>
      line.id === '102'
        ? {
            supplier: 'COLSTE',
            unit_coils: [{ unit: 2, supplier: 'SAMSUNG', coil_number: 'J46A211' }]
          }
        : {}
    )
  )
  await page.goto('/rollforming?view=scheduled')
  await signIn(page)
  await page.getByRole('button', { name: /^All Scheduled Orders/ }).click()
  await page
    .getByRole('row', { name: /330615/ })
    .getByRole('button')
    .first()
    .click()

  await expect(
    page.getByRole('checkbox', { name: /^Select unit \d+ of TED8250 · 120"$/ })
  ).toHaveCount(16)
  const second = page
    .getByRole('row')
    .filter({
      has: page.getByRole('checkbox', { name: 'Select unit 2 of TED8250' })
    })
    .last()
  await expect(second).toContainText('SAMSUNG')
  await expect(second).toContainText('J46A211')
  const first = page
    .getByRole('row')
    .filter({
      has: page.getByRole('checkbox', { name: 'Select unit 1 of TED8250' })
    })
    .last()
  await expect(first).toContainText('COLSTE')
})

test('a line goes to the Slit Line with the Supplier chosen for it', async ({ page }) => {
  await page.goto('/rollforming?view=scheduled')
  await signIn(page)
  await page.getByRole('button', { name: /^All Scheduled Orders/ }).click()
  await page
    .getByRole('row', { name: /330615/ })
    .getByRole('button')
    .first()
    .click()
  await page.getByRole('checkbox', { name: 'Select TED8250' }).click()
  await page.getByRole('button', { name: 'Send to the Slit Line' }).click()

  // The Slit Line fills in the Coil Number left blank (round 8 answers, B4).
  const dialog = page.getByRole('dialog', { name: 'Send to the Slit Line' })
  await dialog.getByLabel('Supplier').click()
  await page.getByRole('option', { name: 'COLSTE' }).click()
  await dialog.getByRole('button', { name: 'Create' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual([
    {
      path: 'slit-line/request/',
      body: { origin_items: ['102'], supplier: 'COLSTE', coil_number: null }
    }
  ])
})

test('a line waiting for the Slit Line reads waiting and is taken back off it', async ({
  page
}) => {
  // The listing carries the line's coil state p2 (1086,321).
  await serveOrders(
    page,
    onRollFormer(line =>
      line.id === '102'
        ? {
            coil_icon: 'waiting_to_slit',
            coil_fields_locked: true,
            supplier: 'waiting...',
            coil_number: 'waiting...'
          }
        : {}
    )
  )
  await page.goto('/rollforming?view=scheduled')
  await signIn(page)
  await page.getByRole('button', { name: /^All Scheduled Orders/ }).click()
  await page
    .getByRole('row', { name: /330615/ })
    .getByRole('button')
    .first()
    .click()

  const line = page.getByRole('row', { name: /TED8250/ }).last()
  await expect(line.getByLabel('Waiting for the Slit Line')).toBeVisible()
  await expect(line).toContainText('waiting...')

  await line.getByRole('checkbox', { name: 'Select TED8250' }).click()
  await page.getByRole('button', { name: 'Take off the Slit Line' }).click()
  await expect
    .poll(() => posted)
    .toEqual([{ path: 'slit-line/cancel/', body: { origin_items: ['102'] } }])
})

test('the Slit Line marks waiting material slit with the coil it used', async ({ page }) => {
  await page.route(`${API_URL}/slit-line/?*`, route =>
    route.fulfill({
      json:
        new URL(route.request().url()).searchParams.get('slit') === 'true'
          ? []
          : [
              {
                origin_item: '102',
                order: 'ARINV-3',
                invoice: '330615',
                product_id: 'TED8250',
                production_date: '2026-09-23',
                icon: 'waiting_to_slit',
                locked: true,
                supplier: 'waiting...',
                coil_number: 'waiting...'
              }
            ]
    })
  )
  await page.goto('/rollforming?view=slit')
  await signIn(page)

  await page.getByRole('checkbox', { name: 'Select TED8250 of 330615' }).click()
  await page.getByRole('button', { name: 'Mark slit (1)' }).click()
  const dialog = page.getByRole('dialog', { name: 'Mark slit' })
  await dialog.getByLabel('Supplier').click()
  await page.getByRole('option', { name: 'SAMSUNG' }).click()
  await dialog.getByLabel('Coil Number').fill('J46A211')
  await dialog.getByRole('button', { name: 'Mark slit' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual([
    {
      path: 'slit-line/mark-slit/',
      body: { origin_items: ['102'], supplier: 'SAMSUNG', coil_number: 'J46A211' }
    }
  ])
})

test('Mark slit starts from the coil the Manager asked for', async ({ page }) => {
  await page.route(`${API_URL}/slit-line/?*`, route =>
    route.fulfill({
      json:
        new URL(route.request().url()).searchParams.get('slit') === 'true'
          ? []
          : [
              {
                origin_item: '102',
                order: 'ARINV-3',
                invoice: '330615',
                product_id: 'TED8250',
                production_date: '2026-09-23',
                icon: 'waiting_to_slit',
                locked: true,
                supplier: 'SAMSUNG',
                coil_number: 'J46A211'
              }
            ]
    })
  )
  await page.goto('/rollforming?view=slit')
  await signIn(page)

  await page.getByRole('checkbox', { name: 'Select TED8250 of 330615' }).click()
  await page.getByRole('button', { name: 'Mark slit (1)' }).click()
  const dialog = page.getByRole('dialog', { name: 'Mark slit' })
  await expect(dialog.getByLabel('Coil Number')).toHaveValue('J46A211')
  await dialog.getByRole('button', { name: 'Mark slit' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual([
    {
      path: 'slit-line/mark-slit/',
      body: { origin_items: ['102'], supplier: 'SAMSUNG', coil_number: 'J46A211' }
    }
  ])
})

test('the Slit Line gives a machine’s request its own day', async ({ page }) => {
  const asked: (string | null)[] = []
  await page.route(`${API_URL}/slit-line/?*`, route => {
    const params = new URL(route.request().url()).searchParams
    asked.push(params.get('scheduled'))
    return route.fulfill({
      json:
        params.get('scheduled') === 'false'
          ? [
              {
                origin_item: '102',
                order: 'ARINV-3',
                invoice: '330615',
                product_id: 'TED8250',
                production_date: '2026-09-23',
                requested_by: 'Roll Former',
                icon: 'waiting_to_slit',
                locked: true,
                supplier: 'waiting...',
                coil_number: 'waiting...'
              }
            ]
          : []
    })
  })
  await page.goto('/rollforming?view=slit')
  await signIn(page)

  const row = page.getByRole('row', { name: /330615/ })
  await expect(row).toContainText('Roll Former')
  await row.getByRole('checkbox', { name: 'Select TED8250 of 330615' }).click()
  await page.getByRole('button', { name: 'Schedule (1)' }).click()
  await page.getByRole('button', { name: /September 24th, 2026/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Schedule' }).click()

  await expect
    .poll(() => posted)
    .toEqual([
      {
        path: 'slit-line/schedule/',
        body: { origin_items: ['102'], production_date: '2026-09-24' }
      }
    ])

  await page.getByRole('tab', { name: 'Scheduled', exact: true }).click()
  await expect(page.getByText('Nothing scheduled')).toBeVisible()
  expect(asked).toContain('true')
})

test('Wrapping checks a label, and Completed names Rollforming’s own locations', async ({
  page
}) => {
  await page.goto('/rollforming?view=wrapping')
  await signIn(page)

  // A label scanned after its package was deleted says so p2 (980,536).
  await expect(page.getByRole('button', { name: 'Scan package' })).toBeVisible()

  await page.getByRole('button', { name: /Completed orders/ }).click()
  await expect(page.getByRole('columnheader', { name: 'Rollforming Location' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Trim Location' })).toBeHidden()
})

test('Wrapping shows the product picture, and a row without one still opens its order', async ({
  page
}) => {
  await page.route(`${API_URL}/wrapping/?*`, route =>
    route.fulfill({
      json: WRAPPING_ROWS.map((row, index) => ({
        ...row,
        product_id: index ? 'TDE8250' : 'TSF8250',
        product_files: index
          ? []
          : [{ id: 9, name: 'TSF8250_1.png', url: 'https://files.e2e.test/TSF8250_1.png' }]
      }))
    })
  )
  await page.goto('/rollforming?view=wrapping')
  await signIn(page)
  // Lines no released order puts on a machine.
  await page.getByRole('tab', { name: 'No machine' }).click()

  await expect(page.getByRole('columnheader', { name: 'Image' })).toBeVisible()
  await page.getByRole('button', { name: 'Drawing of TSF8250' }).click()
  const drawing = page.getByRole('dialog', { name: 'Drawing of TSF8250' })
  await expect(drawing).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawing).toBeHidden()

  // No picture: the cell is the row's, and opens the order like any other.
  const dripEdge = page.getByRole('row').filter({ hasText: 'Drip Edge' })
  await dripEdge
    .getByRole('cell')
    .filter({ hasText: 'TDE8250' })
    .locator('xpath=preceding-sibling::td[1]')
    .click()
  await expect(page.getByRole('button', { name: 'Back to Wrapping' })).toBeVisible()
})

test('a line taken whole from stock has no coil and no box to put it on one', async ({ page }) => {
  // 330615's TED8250: all 16 pieces pulled from stock.
  await serveOrders(
    page,
    onRollFormer(line => (line.id === '102' ? { pull_from_stock: 16 } : {}))
  )
  await page.goto('/rollforming?view=scheduled')
  await signIn(page)
  await page.getByRole('button', { name: /^All Scheduled Orders/ }).click()
  await page
    .getByRole('row', { name: /330615/ })
    .getByRole('button')
    .first()
    .click()

  const line = page.getByRole('row').filter({ hasText: 'TED8250' })
  await expect(line.getByText('Stock', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Select TED8250' })).toBeHidden()
  await expect(line.getByLabel('Rolled from a coil')).toBeHidden()
})

test('Export takes Release with it, and both go on one release', async ({ page }) => {
  let body: unknown
  await page.route(`${API_URL}/departments/1/release/`, async route => {
    body = route.request().postDataJSON()
    await route.fulfill({ json: { released: [21], exported: [21], cutlists: [] } })
  })
  await page.goto('/rollforming?view=scheduled')
  await signIn(page)
  await page.getByRole('button', { name: /^All Scheduled Orders/ }).click()

  // Export ticks Release as well p2 (542,607); taking Release off takes Export with it.
  await page.getByLabel('Export order 330608').click()
  await expect(page.getByLabel('Select order 330608 for release')).toBeChecked()
  await page.getByRole('button', { name: /^Release to production/ }).click()

  const day = { sales_order_id: 21, production_date: '2026-09-23' }
  await expect.poll(() => body).toEqual({ days: [day], export_days: [day] })
  await expect(page.getByText('Released 1 order · 1 exported')).toBeVisible()
})

// A Queue row of one run of material; a named coil is the Manager's, and locked.
const queueRow = (key: string, material: string, supplier: string | null, coil: string | null) => ({
  key,
  production_date: '2026-09-23',
  material_id: material,
  profile: 'Tuff Rib',
  linear_feet: 320.5,
  weight: 657,
  priority: null,
  supplier,
  coil_number: coil,
  coil_icon: 'coil',
  coil_fields_locked: supplier !== null,
  is_overdue: false,
  lines: [{ order_number: '330615', quantity: 3, length: 88 }]
})

test('the Queue lists a machine’s material by day, and the Manager moves it within its day', async ({
  page
}) => {
  let flow: string | null = null
  await page.route(`${API_URL}/rollforming/queue/?*`, route => {
    flow = new URL(route.request().url()).searchParams.get('flow_id')
    return route.fulfill({
      json: [
        queueRow('k1', 'CS8317 WHITE WHITE', null, null),
        queueRow('k2', 'CS8262 BLACK', 'COLSTE', 'F7601268')
      ]
    })
  })
  let reordered: unknown
  await page.route(`${API_URL}/rollforming/queue/reorder/`, route => {
    reordered = route.request().postDataJSON()
    return route.fulfill({ json: [] })
  })
  await page.goto('/rollforming?view=queue')
  await signIn(page)

  await expect(page.getByText('CS8317 WHITE WHITE')).toBeVisible()
  expect(flow).toBe('4')
  // The Manager's coil is used as it is p2 (529,628).
  await expect(
    page
      .getByRole('row', { name: /CS8262/ })
      .getByLabel('Locked')
      .first()
  ).toBeVisible()

  // Picked up by its row and dropped on the one above, within the same day p2 (530,641).
  const from = (await page.getByRole('cell', { name: 'CS8262 BLACK', exact: true }).boundingBox())!
  const to = (await page
    .getByRole('cell', { name: 'CS8317 WHITE WHITE', exact: true })
    .boundingBox())!
  await page.mouse.move(from.x + 10, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + 10, from.y - 10, { steps: 5 })
  await page.mouse.move(from.x + 10, to.y + 2, { steps: 10 })
  await page.mouse.up()
  await expect
    .poll(() => reordered)
    .toEqual({ department_id: 1, flow_id: 4, production_date: '2026-09-23', keys: ['k2', 'k1'] })
})

test('the coil ticked in the machine on the Queue shows on Production', async ({ page }) => {
  const coil = {
    key: 'k2',
    supplier: 'COLSTE',
    coil_number: 'F7601268',
    gauge: '29',
    color: 'Black'
  }
  let current: typeof coil | null = null
  await page.route(`${API_URL}/rollforming/queue/?*`, route =>
    route.fulfill({
      json: [
        queueRow('k1', 'CS8317 WHITE WHITE', null, null),
        { ...queueRow('k2', 'CS8262 BLACK', 'COLSTE', 'F7601268'), current: !!current }
      ]
    })
  )
  const sent: unknown[] = []
  await page.route(`${API_URL}/rollforming/machines/4/current-coil/`, route => {
    const method = route.request().method()
    if (method === 'POST') {
      sent.push(route.request().postDataJSON())
      current = coil
    }
    if (method === 'DELETE') {
      sent.push('DELETE')
      current = null
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({ json: current })
  })
  await page.goto('/rollforming?view=queue')
  await signIn(page)

  // A row with no coil named has nothing to put in the machine p2 (895,300).
  await expect(page.getByRole('checkbox', { name: /CS8317 .* is in the machine/ })).toBeDisabled()
  await page.getByRole('checkbox', { name: /CS8262 .* is in the machine/ }).click()
  await expect(page.getByRole('checkbox', { name: /CS8262 .* is in the machine/ })).toBeChecked()
  expect(sent).toEqual([{ key: 'k2' }])

  await page.getByRole('tab', { name: 'Production' }).click()
  const panel = page.getByRole('region', { name: 'Current coil in the rollformer' })
  await expect(panel).toContainText('F7601268')
  await expect(panel).toContainText('29 Ga Black')

  // Taken back out on the Queue, the machine reads empty again.
  await page.getByRole('tab', { name: 'Queue' }).click()
  await page.getByRole('checkbox', { name: /CS8262 .* is in the machine/ }).press('Space')
  await expect(
    page.getByRole('checkbox', { name: /CS8262 .* is in the machine/ })
  ).not.toBeChecked()
  expect(sent).toEqual([{ key: 'k2' }, 'DELETE'])
  await page.getByRole('tab', { name: 'Production' }).click()
  await expect(panel).toContainText('None')
})

test('the Worker names a Queue row’s coil where the Manager left it Undefined', async ({
  page
}) => {
  // The server words a coil nobody named, rather than sending null.
  const unnamed = {
    ...queueRow('k1', 'CS8250 DARK RED', 'Undefined', 'Undefined'),
    lines: [
      {
        origin_item: '102',
        order_number: '330615',
        product_id: 'TED8250',
        quantity: 3,
        units: null
      },
      {
        origin_item: '103',
        order_number: '330616',
        product_id: 'TED8250',
        quantity: 2,
        units: [2, 3]
      }
    ]
  }
  const slitting = {
    ...queueRow('k2', 'CS8262 BLACK', 'waiting...', 'waiting...'),
    coil_icon: 'waiting_to_slit',
    coil_fields_locked: true
  }
  await page.route(`${API_URL}/rollforming/queue/?*`, route =>
    route.fulfill({ json: [unnamed, slitting] })
  )
  await page.goto('/rollforming?view=queue')
  await signIn(page)

  await expect(page.getByRole('checkbox', { name: /CS8250 .* is in the machine/ })).toBeDisabled()
  // The Slit Line names its own coil once it slits it.
  await expect(page.getByRole('row', { name: /CS8262/ })).toContainText('waiting...')
  await expect(
    page.getByRole('button', { name: /^Supplier and Coil Number for CS8262/ })
  ).toBeHidden()

  await page.getByRole('button', { name: /^Supplier and Coil Number for CS8250/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Supplier / Coil Number' })
  await expect(dialog).toContainText('2 lines of TED8250')
  await dialog.getByLabel('Supplier').click()
  await page.getByRole('option', { name: 'COLSTE' }).click()
  await dialog.getByLabel('Coil Number').fill('F7601268')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(dialog).toBeHidden()
  // A line on the row for some of its units fills in just those.
  expect(posted).toEqual([
    {
      path: 'coil-assignment/fill-in/',
      body: {
        lines: [
          { origin_item: '102', supplier: 'COLSTE', coil_number: 'F7601268' },
          { origin_item: '103', unit: 2, supplier: 'COLSTE', coil_number: 'F7601268' },
          { origin_item: '103', unit: 3, supplier: 'COLSTE', coil_number: 'F7601268' }
        ]
      }
    }
  ])
})

test('Production lists the orders released to the machine, a row per day', async ({ page }) => {
  await serveOrders(
    page,
    onRollFormer(line => (line.id === '102' ? { is_released: true, coil_number: 'F7601268' } : {}))
  )
  await page.goto('/rollforming?view=production')
  await signIn(page)

  const row = page.getByRole('row', { name: /330615/ })
  await expect(row).toContainText('DAP Roofing Inc.')
  await expect(row).toContainText('F7601268')
  // Nothing else is released, so nothing else is on the machine's list.
  await expect(page.getByRole('row', { name: /330608/ })).toBeHidden()
})

test('a Stock line on Production names no coil and no Supplier', async ({ page }) => {
  await serveOrders(
    page,
    onRollFormer(line =>
      line.id === '102'
        ? { is_released: true, status: 'stock', supplier: 'COLSTE', coil_icon: 'coil' }
        : {}
    )
  )
  await page.goto('/rollforming?view=production')
  await signIn(page)

  await page.getByRole('button', { name: 'Expand 330615' }).click()
  const line = page.getByRole('row', { name: /^16 TED8250/ })
  await expect(line).toContainText('Stock')
  await expect(line).not.toContainText('COLSTE')
  await expect(line).not.toContainText('Undefined')
  await expect(line.getByLabel('From a coil')).toBeHidden()
})

test('a line with no coil yet cannot be packed, and says why', async ({ page }) => {
  await serveOrders(
    page,
    onRollFormer(line => (line.id === '102' ? { is_released: true } : {}))
  )
  await page.route(`${API_URL}/wrapping/*`, route =>
    route.fulfill({
      json: [
        {
          item_id: 102,
          origin_item: '102',
          order: 'ARINV-3',
          order_number: '330615',
          description: 'Eave Drip Dark Red',
          production_date: '2026-09-23',
          status: 'not_started',
          qty_ordered: 16,
          left_to_wrap: 16,
          can_wrap: false,
          coil_missing: true
        }
      ]
    })
  )
  await page.goto('/rollforming?view=production')
  await signIn(page)
  // Rollforming packs at the machine p2 (1010,346), so the order opens from Production.
  await page.getByRole('row', { name: /Package 330615/ }).click()

  await expect(page.getByText('No coil yet')).toBeVisible()
  await expect(
    page.getByTitle('Needs a Supplier and Coil Number before it is packaged')
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /^Supplier and Coil Number for / })).toBeVisible()
})

test('the Worker fills in the units of a line still without a coil', async ({ page }) => {
  await serveOrders(
    page,
    onRollFormer(line =>
      line.id === '102'
        ? {
            is_released: true,
            unit_coils: [
              {
                unit: 2,
                supplier: 'SAMSUNG',
                coil_number: 'J46A211',
                supplier_locked: true,
                coil_number_locked: true
              }
            ]
          }
        : {}
    )
  )
  await page.route(`${API_URL}/wrapping/*`, route =>
    route.fulfill({
      json: [
        {
          item_id: 102,
          origin_item: '102',
          order: 'ARINV-3',
          order_number: '330615',
          product_id: 'TED8250',
          production_date: '2026-09-23',
          status: 'not_started',
          qty_ordered: 3,
          left_to_wrap: 3,
          can_wrap: false,
          coil_missing: true
        }
      ]
    })
  )
  await page.goto('/rollforming?view=production')
  await signIn(page)
  await page.getByRole('row', { name: /Package 330615/ }).click()

  await expect(page.getByText('2 coils')).toBeVisible()
  await page.getByRole('button', { name: 'Supplier and Coil Number for TED8250' }).click()
  const dialog = page.getByRole('dialog', { name: 'Supplier / Coil Number' })
  await expect(dialog).toContainText('Units 1, 3 of TED8250')
  await dialog.getByLabel('Supplier').click()
  await page.getByRole('option', { name: 'COLSTE' }).click()
  await dialog.getByLabel('Coil Number').fill('F7601268')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual([
    {
      path: 'coil-assignment/fill-in/',
      body: {
        lines: [
          { origin_item: '102', unit: 1, supplier: 'COLSTE', coil_number: 'F7601268' },
          { origin_item: '102', unit: 3, supplier: 'COLSTE', coil_number: 'F7601268' }
        ]
      }
    }
  ])
})

test('the last package of an order still prints its label once the order leaves Production', async ({
  page
}) => {
  const printed = await capturePrints(page)
  await serveOrders(
    page,
    onRollFormer(line => (line.id === '102' ? { is_released: true, coil_number: 'F7601268' } : {}))
  )
  await page.route(`${API_URL}/wrapping/*`, route =>
    route.fulfill({
      json: [
        {
          item_id: 102,
          origin_item: '102',
          order: 'ARINV-3',
          order_number: '330615',
          product_id: 'TED8250',
          description: 'Eave Drip Dark Red',
          production_date: '2026-09-23',
          status: 'not_started',
          qty_ordered: 16,
          left_to_wrap: 16,
          can_wrap: true,
          auto_fill_available: true,
          auto_fill_amount: 16
        }
      ]
    })
  )
  await page.route(`${API_URL}/wrapping/packages/`, async route => {
    // The package rolls the order's last line, so the order is no longer on the machine's list.
    await serveOrders(page, onRollFormer())
    return route.fulfill({ json: { id: 71, name: '02-330615-01' } })
  })
  await page.goto('/rollforming?view=production')
  await signIn(page)
  await page.getByRole('row', { name: /Package 330615/ }).click()
  await page.getByRole('button', { name: 'Auto fill' }).first().click()
  await page.getByRole('button', { name: 'Create & print' }).click()

  await expect(page.getByRole('row', { name: /Package 330615/ })).toBeHidden()
  await expect.poll(printed).toEqual([expect.stringMatching(/02-330615-01Order 330615.*16/)])
})
