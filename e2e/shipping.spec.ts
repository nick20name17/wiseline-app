import { expect, test, type Page } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

const DAY = '2026-09-30'

// One truck, one Load, one order, one package: the server moves the statuses, the mock mirrors it.
const mockLoad = async (page: Page, start: string) => {
  const load = {
    status: start,
    order: start,
    loaded: false
  }
  const order = () => ({
    assignment_id: 2,
    order: 'ORD-2',
    order_number: 'W20793',
    customer: 'Wigle Home Hardware',
    kind: 'delivery',
    weight: 190.34,
    load_id: 126,
    status: load.order
  })
  const posted: string[] = []

  await page.route(`${API_URL}/shipping/scheduled/?*`, route =>
    route.fulfill({
      json: [
        {
          truck_id: 105,
          name: '105',
          weight_limit: 5000,
          delivery: {},
          pickup: {},
          orders: [order()]
        }
      ]
    })
  )
  await page.route(`${API_URL}/shipping/trucks/105/loads/?*`, route =>
    route.fulfill({
      json: [
        { load_id: 126, name: 'Load 2', status: load.status, weight: 190.34, orders: [order()] }
      ]
    })
  )
  await page.route(`${API_URL}/wrapping/orders/ORD-2/packages/`, route =>
    route.fulfill({
      json: [
        {
          package_id: 7,
          name: '03-W20793-1',
          weight: 190.34,
          location: 'A-04',
          is_loaded: load.loaded
        }
      ]
    })
  )
  await page.route(`${API_URL}/shipping/**`, route => {
    const { pathname } = new URL(route.request().url())
    if (route.request().method() !== 'POST') return route.fallback()
    posted.push(pathname.replace('/shipping/', ''))
    if (pathname.endsWith('/packages-loaded/'))
      Object.assign(load, { status: 'loaded', order: 'loaded', loaded: true })
    if (pathname.endsWith('/left-warehouse/'))
      Object.assign(load, { status: 'en_route', order: 'en_route' })
    if (pathname.endsWith('/delivered/'))
      Object.assign(load, { status: 'delivered', order: 'delivered' })
    if (pathname.endsWith('/complete/')) load.status = 'completed'
    return route.fulfill({ json: {} })
  })
  return posted
}

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
})

test('Loading ticks a package onto the truck and the Load reads Loaded', async ({ page }) => {
  const posted = await mockLoad(page, 'not_started')
  await page.goto(`/loading?day=${DAY}`)
  await signIn(page)

  await expect(page.getByText('Load 2')).toBeVisible()
  await page.getByRole('checkbox', { name: '03-W20793-1 loaded' }).click()

  await expect(page.getByRole('checkbox', { name: '03-W20793-1 loaded' })).toBeChecked()
  await expect(page.getByText('Loaded').first()).toBeVisible()
  expect(posted).toEqual(['loads/126/packages-loaded/'])
})

test('the Driver leaves, delivers and completes the Load', async ({ page }) => {
  const posted = await mockLoad(page, 'loaded')
  await page.goto(`/driver?day=${DAY}`)
  await signIn(page)

  // Nothing is delivered before the truck has left.
  await expect(page.getByRole('button', { name: 'Delivered' })).toBeHidden()
  await page.getByRole('button', { name: 'Left the warehouse' }).click()
  await page.getByRole('button', { name: 'Delivered' }).click()
  await page.getByRole('button', { name: 'Complete Load 2' }).click()

  await expect(page.getByText('No Load to drive')).toBeVisible()
  expect(posted).toEqual(['loads/126/left-warehouse/', 'delivered/', 'loads/126/complete/'])
})

test.describe('a truck on the Scheduled tab', () => {
  const assignment = (id: number, number: string, loadId: number | null) => ({
    assignment_id: id,
    order: `ORD-${id}`,
    order_number: number,
    customer: `Customer ${number}`,
    kind: 'delivery',
    weight: 100,
    load_id: loadId,
    status: null
  })
  const onLoad = [assignment(3, '110825', 40), assignment(4, '114041', 40)]
  const stops = [
    {
      route_id: 11,
      sequence: 1,
      order_number: '110825',
      name: 'GM',
      address: '8 Northview Dr',
      city: 'Tillsonburg'
    },
    {
      route_id: 12,
      sequence: 2,
      order_number: '114041',
      name: 'JPM',
      address: '2966 Brigham Rd',
      city: 'London'
    }
  ]
  let posted: { path: string; body: unknown }[]

  test.beforeEach(async ({ page }) => {
    posted = []
    await page.route(`${API_URL}/shipping/scheduled/?*`, route =>
      route.fulfill({
        json: [
          {
            truck_id: 105,
            name: '105',
            weight_limit: 5000,
            delivery: {},
            pickup: {},
            orders: [assignment(1, 'W12631', null), assignment(2, 'W20936', null), ...onLoad]
          }
        ]
      })
    )
    await page.route(`${API_URL}/shipping/trucks/105/loads/?*`, route =>
      route.fulfill({
        json: [{ load_id: 40, name: 'Load 1', status: 'unreleased', weight: 200, orders: onLoad }]
      })
    )
    await page.route(`${API_URL}/shipping/loads/40/route/`, route =>
      route.request().method() === 'GET' ? route.fulfill({ json: stops }) : route.fallback()
    )
    await page.route(`${API_URL}/shipping/truck-panels/`, route =>
      route.fulfill({ json: [{ truck_id: 106, name: '106', weight_limit: 17000 }] })
    )
    await page.route(`${API_URL}/shipping/**`, route => {
      const request = route.request()
      const path = new URL(request.url()).pathname.replace('/shipping/', '')
      if (request.method() === 'GET' || path === 'truck-panels/') return route.fallback()
      posted.push({ path, body: request.postDataJSON() })
      return route.fulfill({ json: path.endsWith('route/') ? [...stops].reverse() : {} })
    })

    await page.goto(`/shipping?view=scheduled&day=${DAY}`)
    await signIn(page)
    await page.getByRole('button', { name: 'Truck 105' }).click()
  })

  test('reschedules the ticked orders not on a Load', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Select order W12631' }).click()
    await page.getByRole('button', { name: 'Reschedule' }).click()
    const dialog = page.getByRole('dialog', { name: 'Reschedule 1 order' })
    await dialog.getByRole('button', { name: 'Select Ship Date…' }).click()
    await page.getByRole('button', { name: /October 1st, 2026/ }).click()
    await dialog.getByText('Truck 106').click()
    await dialog.getByRole('button', { name: 'Apply' }).click()

    await expect(page.getByText('Rescheduled to Thu, October 1, 2026')).toBeVisible()
    expect(posted).toEqual([
      {
        path: 'apply/',
        body: { orders: ['ORD-1'], pickup_ids: [], ship_date: '2026-10-01', truck_id: 106 }
      }
    ])
  })

  test('adds a supplier pickup onto the truck for the day', async ({ page }) => {
    await page.getByRole('button', { name: 'Supplier pickup' }).click()
    const dialog = page.getByRole('dialog', { name: 'Supplier pickup' })
    await dialog.getByLabel('Supplier').fill('  Acme Fasteners  ')
    await dialog.getByLabel('Weight (lbs)').fill('120')
    await dialog.getByRole('button', { name: 'Add pickup' }).click()

    await expect(dialog).toBeHidden()
    expect(posted).toEqual([
      {
        path: 'pickups/',
        body: {
          supplier: 'Acme Fasteners',
          description: null,
          weight: 120,
          length: null,
          ship_date: DAY,
          truck_id: 105
        }
      }
    ])
  })

  test('drags a delivery down the route and saves the whole sequence', async ({ page }) => {
    const route = page.getByRole('region', { name: 'Delivery route of Load 1' })
    await expect(route.getByRole('link', { name: /on the map/ })).toHaveAttribute(
      'href',
      /origin=8\+Northview\+Dr.*destination=2966\+Brigham\+Rd/
    )
    const grip = route.getByRole('button', { name: 'Move 110825' })
    const announced = page.getByRole('status')
    await grip.focus()
    await page.keyboard.press('Space')
    // Picking up counts as being over its own place, which may be what is heard last.
    await expect(announced).toHaveText(/110825/)
    await page.keyboard.press('ArrowDown')
    await expect(announced).toHaveText('110825 moved to 2 of 2.')
    await page.keyboard.press('Space')

    await expect
      .poll(() => posted)
      .toEqual([{ path: 'loads/40/route/', body: { route_ids: [12, 11] } }])
  })
})
