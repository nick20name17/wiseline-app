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
