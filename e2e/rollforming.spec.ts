import { expect, test, type Page } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { SCHEDULED_ORDERS, mockTrimApi, signIn } from './trim-api.ts'

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
    'slit-line/mark-slit/'
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
  // The second row: a tab per rollformer p2 (542,280), and the lines no machine takes.
  const machines = page.getByRole('tablist').nth(1)
  await expect(machines.getByRole('tab', { name: 'Roll Former' })).toBeVisible()
  await expect(machines.getByRole('tab', { name: 'No machine' })).toBeVisible()
  await expect(machines.getByRole('tab', { name: 'Press Brake' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Stock Cards' })).toBeHidden()
  await expect(page.getByRole('button', { name: /Bypass Production/ })).toBeHidden()
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
const queueRow = (key: string, material: string, supplier: string, coil: string) => ({
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
  coil_fields_locked: supplier !== 'Undefined',
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
        queueRow('k1', 'CS8317 WHITE WHITE', 'Undefined', 'Undefined'),
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

test('a line with no coil yet cannot be packed, and says why', async ({ page }) => {
  await page.route(`${API_URL}/wrapping/*`, route =>
    route.fulfill({
      json: [
        {
          item_id: 9001,
          origin_item: '901',
          order: 'ARINV-2',
          order_number: '330608',
          description: 'Tuff Rib White White',
          production_date: '2026-09-23',
          status: 'not_started',
          qty_ordered: 10,
          left_to_wrap: 10,
          can_wrap: false,
          coil_missing: true
        }
      ]
    })
  )
  await page.goto('/rollforming?view=wrapping')
  await signIn(page)
  await page.getByRole('row').filter({ hasText: 'Tuff Rib White White' }).click()

  await expect(page.getByText('No coil yet')).toBeVisible()
  await expect(
    page.getByTitle('Needs a Supplier and Coil Number before it is packaged')
  ).toBeVisible()
})
