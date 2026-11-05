import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const WAREHOUSES = {
  count: 1,
  results: [
    {
      id: 1,
      name: 'Tillsonburg',
      address: '21 Clearview Dr',
      description: null,
      position: 1,
      locations: []
    }
  ]
}

const DEPARTMENTS = [{ id: 1, name: 'Trim', code: 'trim' }]

const TYPES = [
  {
    id: 7,
    name: 'Trim racks',
    warehouse_id: 1,
    department_id: 1,
    description: 'Racks along the north wall',
    position: 1,
    kind: 'order'
  },
  {
    id: 8,
    name: 'Coil bays',
    warehouse_id: 1,
    department_id: 1,
    description: null,
    position: 2,
    kind: 'inventory'
  },
  {
    id: 9,
    name: 'Bundle carts',
    warehouse_id: 1,
    department_id: 1,
    description: null,
    position: 3,
    kind: 'order'
  }
]

const LOCATIONS = {
  count: 3,
  results: [
    {
      id: 11,
      code: '101',
      position: 1,
      warehouse_id: 1,
      location_type_id: 7,
      weight: 500,
      description: 'By the door',
      multi_order: true,
      max_orders: 4
    },
    {
      id: 12,
      code: '102',
      position: 2,
      warehouse_id: 1,
      location_type_id: 7,
      weight: null,
      description: null,
      multi_order: false,
      max_orders: null
    },
    {
      id: 21,
      code: 'C1',
      position: 3,
      warehouse_id: 1,
      location_type_id: 8,
      weight: null,
      description: null,
      multi_order: false,
      max_orders: null
    }
  ]
}

const signIn = async (page: Parameters<typeof mockAuthApi>[0]) => {
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
}

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await page.route(`${API_URL}/departments/all/`, route => route.fulfill({ json: DEPARTMENTS }))
  await page.route(`${API_URL}/warehouses/*`, route => route.fulfill({ json: WAREHOUSES }))
  await page.route(`${API_URL}/location-types/all/*`, route => route.fulfill({ json: TYPES }))
  await page.route(`${API_URL}/location-types/*`, route =>
    route.fulfill({ json: { count: TYPES.length, results: TYPES } })
  )
  await page.route(`${API_URL}/locations/*`, route => route.fulfill({ json: LOCATIONS }))
})

test('the locations list names the warehouse and type each one hangs off', async ({ page }) => {
  await page.goto('/settings/locations')
  await signIn(page)

  await expect(page.getByText('2 locations')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: '101' })
  await expect(row.getByText('Tillsonburg')).toBeVisible()
  await expect(row.getByText('Trim racks')).toBeVisible()
  // A multi-order location says how many it takes; a single-order one says nothing.
  await expect(row.getByText('4')).toBeVisible()
})

test('the tabs split order locations from inventory ones', async ({ page }) => {
  await page.goto('/settings/locations')
  await signIn(page)

  await expect(page.getByRole('tab', { name: 'Order Locations', selected: true })).toBeVisible()
  await expect(page.getByText('2 locations')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'C1' })).toHaveCount(0)

  await page.getByRole('tab', { name: 'Inventory Locations' }).click()
  await expect(page).toHaveURL(/kind=inventory/)
  await expect(page.getByText('1 location in Trim')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Coil bays' })).toBeVisible()
})

test('only locations that hold coils get labels to scan', async ({ page }) => {
  await page.goto('/settings/locations')
  await signIn(page)
  await expect(page.getByText('2 locations')).toBeVisible()
  // Package racks are picked from a list, not scanned.
  await expect(page.getByRole('button', { name: 'Print inventory labels' })).toBeHidden()

  // The print dialog would hold the page; counting the calls is enough.
  await page.addInitScript(() => {
    window.print = () => {
      ;(window as unknown as { printed: number }).printed =
        ((window as unknown as { printed?: number }).printed ?? 0) + 1
    }
  })
  await page.goto('/settings/locations?kind=inventory')
  await page.getByRole('button', { name: 'Print inventory labels' }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { printed?: number }).printed))
    .toBe(1)
})

test('a location offers only the types in its own warehouse', async ({ page }) => {
  await page.goto('/settings/locations')
  await signIn(page)
  await page.getByRole('button', { name: 'Add location' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Add location' })).toBeVisible()
  // Nothing is picked until somebody picks it.
  await expect(dialog.getByRole('combobox', { name: 'Warehouse' })).toContainText('Select...')
  await expect(dialog.getByRole('combobox', { name: 'Location Type' })).toContainText('Select...')
  // The page shows one department, the first, and a new location is made in it.
  await expect(dialog.getByText('Department: Trim')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Save' })).toBeVisible()

  await dialog.getByRole('combobox', { name: 'Warehouse' }).click()
  await page.getByRole('option', { name: 'Tillsonburg' }).click()
  await dialog.getByRole('combobox', { name: 'Location Type' }).click()
  await expect(page.getByRole('option', { name: 'Trim racks' })).toBeVisible()
  await page.getByRole('option', { name: 'Trim racks' }).click()
  await expect(dialog.getByText('Department: Trim')).toBeVisible()
  await page.screenshot({ path: '/tmp/location.png' })

  // The number of orders only matters once the location takes more than one.
  await expect(dialog.getByLabel('Number of orders')).toBeHidden()
  await dialog.getByRole('switch').click()
  await expect(dialog.getByLabel('Number of orders')).toBeVisible()
  // Only the fields the design has; the API's dimensions are not asked for.
  await expect(dialog.getByLabel('Dimensions')).toHaveCount(0)
  await expect(dialog.getByLabel('Max weight (lb)')).toHaveValue('1000')
})

test('a location type carries the department its locations inherit', async ({ page }) => {
  await page.goto('/settings/location-types')
  await signIn(page)

  // The page opens on the first department, with no All: the pill says which, so no column does.
  await expect(page.getByRole('button', { name: 'All' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Trim', exact: true, pressed: true })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Department' })).toHaveCount(0)
  const row = page.getByRole('row').filter({ hasText: 'Trim racks' })
  await expect(row.getByText('Tillsonburg')).toBeVisible()
})

test('deleting a type says why it may be refused', async ({ page }) => {
  await page.goto('/settings/location-types')
  await signIn(page)
  await page.getByRole('button', { name: 'Delete Trim racks' }).click()

  await expect(page.getByText('Delete location type Trim racks?')).toBeVisible()
  await expect(page.getByText(/left without a department/)).toBeVisible()
})

test('the type waits for a warehouse, and says so', async ({ page }) => {
  await page.goto('/settings/locations')
  await signIn(page)
  await page.getByRole('button', { name: 'Add location' }).click()

  const dialog = page.getByRole('dialog')
  const type = dialog.getByRole('combobox', { name: 'Location Type' })
  await expect(type).toBeDisabled()
  await expect(type).toHaveAccessibleDescription('Select a warehouse first')

  await dialog.getByRole('combobox', { name: 'Warehouse' }).click()
  await page.getByRole('option', { name: 'Tillsonburg' }).click()
  await expect(type).toBeEnabled()
  await expect(dialog.getByText('Select a warehouse first')).toBeHidden()
})

test('a drag saves the whole department order, the other tab’s types kept in place', async ({
  page
}) => {
  await page.goto('/settings/location-types')
  await signIn(page)
  await expect(
    page.getByRole('tab', { name: 'Order Location Types', selected: true })
  ).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Coil bays' })).toHaveCount(0)

  // Registered after the shared mocks, so it answers first.
  const saved = new Promise<unknown>(resolve =>
    page.route(`${API_URL}/location-types/reorder/`, route => {
      resolve(route.request().postDataJSON())
      return route.fulfill({ json: {} })
    })
  )
  const grip = page.getByRole('button', { name: 'Move Bundle carts' })
  // Rows stay put until every type of the department is in, which the saved order is built from.
  await expect(grip).toHaveAttribute('aria-disabled', 'false')
  await grip.focus()
  const announced = page.getByRole('status').filter({ hasText: 'Bundle carts' })
  await page.keyboard.press('Space')
  await expect(announced).toHaveText(/ 2 of 2\./)
  // A step pressed while the rows are still being measured is lost; with two rows, one more press
  // cannot overshoot.
  await expect(async () => {
    await page.keyboard.press('ArrowUp')
    await expect(announced).toHaveText('Bundle carts moved to 1 of 2.', { timeout: 1000 })
  }).toPass()
  await page.keyboard.press('Space')

  expect(await saved).toEqual({ department: 1, ids: [9, 8, 7] })
})

test('the inventory tab lists only the types that hold stock', async ({ page }) => {
  await page.goto('/settings/location-types?kind=inventory')
  await signIn(page)

  await expect(page.getByRole('row').filter({ hasText: 'Coil bays' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Trim racks' })).toHaveCount(0)
})

test('a dialog dragged wider stays centred and opens at that width again', async ({ page }) => {
  await page.goto('/settings/locations')
  await signIn(page)
  const dialog = page.getByRole('dialog')
  await page.getByRole('button', { name: 'Add location' }).click()
  await expect(dialog.getByRole('heading', { name: 'Add location' })).toBeVisible()
  // Measured mid zoom-in, the box is smaller than the one the drag starts from.
  await dialog.evaluate(element => Promise.all(element.getAnimations().map(each => each.finished)))
  const before = (await dialog.boundingBox())!

  // Both edges move, so the right edge dragged 50px out widens it by 100.
  await page.mouse.move(before.x + before.width - 3, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width + 47, before.y + before.height / 2, { steps: 5 })
  await page.mouse.up()
  const after = (await dialog.boundingBox())!
  expect(Math.round(after.width)).toBe(Math.round(before.width) + 100)
  expect(Math.round(after.x)).toBe(Math.round(before.x) - 50)

  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: 'Add location' }).click()
  await expect
    .poll(async () => Math.round((await dialog.boundingBox())!.width))
    .toBe(Math.round(after.width))

  // A double-click on an edge gives the dialog back its own size.
  await page.mouse.dblclick(after.x + after.width - 3, after.y + after.height / 2)
  await expect
    .poll(async () => Math.round((await dialog.boundingBox())!.width))
    .toBe(Math.round(before.width))
})
