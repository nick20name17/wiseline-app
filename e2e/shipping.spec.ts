import { expect, test, type Page } from '@playwright/test'
import { API_URL, mockAuthApi, user } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

const DAY = '2026-09-30'
const SHIPPING = { id: 4, name: 'Shipping', code: 'shipping' }

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

  // The day's Loads in the asked statuses, as the server filters them.
  await page.route(`${API_URL}/shipping/loads/?*`, route => {
    const statuses = new URL(route.request().url()).searchParams.getAll('status')
    return route.fulfill({
      json: statuses.includes(load.status)
        ? [
            {
              load_id: 126,
              name: 'Load 2',
              status: load.status,
              weight: 190.34,
              orders: [order()],
              truck: { id: 105, name: '105' }
            }
          ]
        : []
    })
  })
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
  // Shipping, Loading and the Driver page open only to a Shipping Manager.
  await page.route(`${API_URL}/departments/all/`, route =>
    route.fulfill({ json: [{ id: 1, name: 'Trim', code: 'trim' }, SHIPPING] })
  )
  await page.route(`${API_URL}/departments/users/assignments/*`, route =>
    route.fulfill({ json: [{ user: user.id, department: SHIPPING.id, role: 'manager' }] })
  )
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

test('a Load on the road leaves the Loading window, so none of its orders can be ticked', async ({
  page
}) => {
  await mockLoad(page, 'en_route')
  await page.goto(`/loading?day=${DAY}`)
  await signIn(page)

  await expect(page.getByText('Nothing to load')).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
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

test('an unscheduled order opens on its lines and packages, and its note is checked off with the tick kept', async ({
  page
}) => {
  let read = false
  // The row carries its note (round 8 answers, B2).
  await page.route(`${API_URL}/shipping/unscheduled/?*`, route =>
    route.fulfill({
      json: {
        count: 1,
        results: [
          {
            order: 'ORD-7',
            order_number: '116764',
            customer: 'Kielstra',
            weight: 40,
            note: { has_note: true, text: 'Trim Location: 30', author: 'JAKE FEHR', read },
            lines_total: 2,
            lines_ready: 1
          }
        ]
      }
    })
  )
  await page.route(`${API_URL}/wrapping/orders/ORD-7/packages/`, route =>
    route.fulfill({
      json: [{ package_id: 9, name: '01-116764-1', weight: 40, location: 'A-01', is_loaded: false }]
    })
  )
  // Not ready first, as the server sorts them (round 10, C1).
  await page.route(`${API_URL}/shipping/orders/ORD-7/lines/`, route =>
    route.fulfill({
      json: [
        {
          origin_item: 'L-2',
          department: 'Trim',
          product_id: 'TSG8306',
          description: 'Gable trim',
          quantity: 4,
          packaged: 0,
          status: 'bent',
          ready: false
        },
        {
          origin_item: 'L-1',
          department: 'Trim',
          product_id: 'TRC4426',
          description: 'Ridge cap',
          quantity: 2,
          packaged: 2,
          status: 'wrapped',
          ready: true
        }
      ]
    })
  )
  await page.route(`${API_URL}/orders/ORD-7/note/read/`, route => {
    read = true
    return route.fulfill({ json: {} })
  })
  await page.goto('/shipping?view=unscheduled')
  await signIn(page)

  await expect(page.getByRole('button', { name: '1 of 2 ready' })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Select order 116764' }).click()
  await page.getByRole('button', { name: 'Expand order 116764' }).click()
  await expect(page.getByText('01-116764-1')).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'TSG8306' })).toContainText('Not ready')
  await expect(page.getByRole('listitem').filter({ hasText: 'TSG8306' })).toContainText('Bent')

  await page.getByRole('button', { name: 'Order notes for 116764' }).click()
  await expect(page.getByText('Trim Location: 30')).toBeVisible()
  await page.getByRole('button', { name: 'Mark dealt with' }).click()
  await expect.poll(() => read).toBe(true)
  // Expanding and the notes leave the tick where it was p3 (560,202).
  await expect(page.getByRole('checkbox', { name: 'Select order 116764' })).toBeChecked()
})

test('an unscheduled order takes a Shipping priority, its sales order made first', async ({
  page
}) => {
  let priority: { id: number; name: string } | null = null
  const sent: { method: string; path: string; body: unknown }[] = []
  await page.route(`${API_URL}/priorities/?*`, route =>
    route.fulfill({
      json: [
        { id: 77, name: '8:00', color: '#2563eb', position: 2, department: null },
        { id: 76, name: 'ASAP', color: '#dc2626', position: 1, department: null }
      ]
    })
  )
  await page.route(`${API_URL}/shipping/unscheduled/?*`, route =>
    route.fulfill({
      json: {
        count: 1,
        results: [
          {
            order: 'ORD-7',
            order_number: '116764',
            customer: 'Kielstra',
            weight: 40,
            ship_date: '2026-09-01',
            is_overdue: true,
            sales_order_id: priority ? 31 : null,
            priority
          }
        ]
      }
    })
  )
  await page.route(`${API_URL}/sales-orders/**`, route => {
    const request = route.request()
    sent.push({
      method: request.method(),
      path: new URL(request.url()).pathname,
      body: request.postDataJSON()
    })
    if (request.method() === 'PATCH') priority = { id: 76, name: 'ASAP' }
    return route.fulfill({ json: { id: 31 } })
  })
  await page.goto('/shipping?view=unscheduled')
  await signIn(page)

  const row = page.getByRole('row').filter({ hasText: '116764' })
  await expect(row.getByTitle('Overdue')).toBeVisible()
  await row.getByRole('combobox', { name: 'Set priority' }).click()
  // The list keeps the department's order, whatever the server sent.
  await expect(page.getByRole('option')).toHaveText(['ASAP', '8:00', 'No priority'])
  await page.getByRole('option', { name: 'ASAP' }).click()

  await expect(row.getByRole('combobox', { name: 'Priority: ASAP' })).toBeVisible()
  await expect
    .poll(() => sent)
    .toEqual([
      { method: 'POST', path: '/sales-orders/', body: { order: 'ORD-7' } },
      { method: 'PATCH', path: '/sales-orders/31/departments/4/', body: { priority: 76 } }
    ])
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
    await page.route(`${API_URL}/shipping/selection-totals/`, route =>
      route.fulfill({
        json: {
          delivery: { count: 1, total_weight: 95.5, longest_length: 162 },
          pickup: { count: 0, total_weight: 0, longest_length: 0 }
        }
      })
    )
    await page.route(`${API_URL}/shipping/**`, route => {
      const request = route.request()
      const path = new URL(request.url()).pathname.replace('/shipping/', '')
      if (request.method() === 'GET' || path === 'truck-panels/' || path === 'selection-totals/')
        return route.fallback()
      posted.push({ path, body: request.postDataJSON() })
      return route.fulfill({ json: path.endsWith('route/') ? [...stops].reverse() : {} })
    })

    await page.goto(`/shipping?view=scheduled&day=${DAY}`)
    await signIn(page)
    await page.getByRole('button', { name: 'Truck 105' }).click()
  })

  test('a day with no Load yet offers one, and Add To Load makes it', async ({ page }) => {
    await page.route(`${API_URL}/shipping/trucks/105/loads/?*`, route =>
      route.fulfill({
        json: [
          { load_id: null, name: 'Load 1', status: null, weight: 0, orders: [], is_empty: true }
        ]
      })
    )
    await page.reload()
    await page.getByRole('button', { name: 'Truck 105' }).click()

    await page.getByRole('checkbox', { name: 'Select order W12631' }).click()
    await page.getByRole('button', { name: 'Add to Load 1' }).click()
    await expect
      .poll(() => posted)
      .toEqual([{ path: 'loads/add/', body: { assignment_ids: [1], load_id: null } }])
  })

  test('reschedules the ticked orders not on a Load', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Select order W12631' }).click()
    await page.getByRole('button', { name: 'Reschedule' }).click()
    const dialog = page.getByRole('dialog', { name: 'Reschedule 1 order' })
    // Deliveries and pickups are boxed apart, the longest length read back from the server p3 (586,246).
    await expect(dialog.getByText(`95.5 lbs · longest 13'6" (162")`)).toBeVisible()
    await expect(dialog.getByText('Pickups · 0')).toBeVisible()
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

  test('a route never built starts at the warehouse, which stays first', async ({ page }) => {
    await page.route(`${API_URL}/shipping/loads/40/route/`, route =>
      route.request().method() === 'GET'
        ? route.fulfill({
            json: [
              {
                route_id: null,
                sequence: null,
                dispatch_point: true,
                name: 'Main warehouse',
                address: '1 Yard Rd',
                city: 'Aylmer'
              },
              ...stops.map(stop => ({ ...stop, route_id: null, sequence: null }))
            ]
          })
        : route.fallback()
    )
    await page.reload()
    await page.getByRole('button', { name: 'Truck 105' }).click()

    const route = page.getByRole('region', { name: 'Delivery route of Load 1' })
    await expect(route.getByText('Main warehouse')).toBeVisible()
    await expect(route.getByRole('button', { name: /^Move / })).toHaveCount(0)
    await expect(route.getByRole('button', { name: 'Plan route' })).toBeVisible()
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

test('Unscheduled narrows to the ship dates in the address', async ({ page }) => {
  const asked: URLSearchParams[] = []
  await page.route(`${API_URL}/shipping/unscheduled/?*`, route => {
    asked.push(new URL(route.request().url()).searchParams)
    return route.fulfill({ json: { count: 0, results: [] } })
  })
  await page.goto('/shipping?view=unscheduled&shipFrom=2026-10-01&shipTo=2026-10-09')
  await signIn(page)

  await expect(page.getByText('No delivery waits for a truck on these ship dates.')).toBeVisible()
  const last = () => asked.at(-1)
  await expect.poll(() => last()?.get('ship_date__gte')).toBe('2026-10-01')
  expect(last()?.get('ship_date__lte')).toBe('2026-10-09')

  await page.getByRole('button', { name: 'Clear the ship date filter' }).click()
  await expect.poll(() => last()?.has('ship_date__gte')).toBe(false)
  await expect(page).not.toHaveURL(/shipFrom/)
})

test('Loading says how much of an order is ready, so Loading is not read as stuck', async ({
  page
}) => {
  await page.route(`${API_URL}/shipping/loads/?*`, route =>
    route.fulfill({
      json: [
        {
          load_id: 126,
          name: 'Load 2',
          status: 'loading',
          weight: 190.34,
          truck: { id: 105, name: '105' },
          orders: [
            {
              assignment_id: 2,
              order: 'ORD-2',
              order_number: 'W20793',
              customer: 'Wigle Home Hardware',
              kind: 'delivery',
              weight: 190.34,
              load_id: 126,
              status: 'loading',
              lines_total: 3,
              lines_ready: 2
            }
          ]
        }
      ]
    })
  )
  await page.route(`${API_URL}/wrapping/orders/ORD-2/packages/`, route =>
    route.fulfill({ json: [] })
  )
  await page.goto(`/loading?day=${DAY}`)
  await signIn(page)

  await expect(page.getByRole('button', { name: '2 of 3 ready' })).toBeVisible()
})
