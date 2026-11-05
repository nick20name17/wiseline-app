import { expect, test, type Page } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const DEPARTMENTS = [
  { id: 1, name: 'Trim', code: 'trim', position: 1 },
  { id: 2, name: 'Rollforming', code: 'rollforming', position: 2 },
  { id: 4, name: 'Shipping', code: 'shipping', position: 4 }
]

const count = (times: number, pieces: number) => ({ times, pieces })

const SUMMARY = {
  date_from: '2026-11-01',
  date_to: '2026-11-04',
  department_id: 1,
  machines: [
    { flow_id: 12, machine: 'Caps', spoiled: count(1, 2), remakes: count(0, 0) },
    { flow_id: 10, machine: 'Press Brake', spoiled: count(2, 3.5), remakes: count(2, 5) },
    { flow_id: null, machine: null, spoiled: count(1, 1), remakes: count(0, 0) }
  ],
  totals: { spoiled: count(4, 6.5), remakes: count(2, 5) }
}

const part = (id: number, flow_id: number | null, machine: string | null, spoiled: number) => ({
  id,
  order: `ORD${id}`,
  order_number: `5${id}`,
  origin_item: `I${id}`,
  product_id: 'RC-10',
  description: `Ridge Cap ${id}`,
  department_id: 1,
  flow_id,
  machine,
  user_id: 3,
  before: 0,
  after: spoiled,
  at_release: 0,
  spoiled,
  created_at: '2026-11-03T14:30:00+00:00'
})

const SPOILED = [
  part(1, 10, 'Press Brake', 2),
  part(2, 12, 'Caps', 2),
  part(3, 10, 'Press Brake', 1.5),
  part(4, null, null, 1)
]

const REMAKES = {
  count: 2,
  results: [
    {
      id: 31,
      order: 'ORD9',
      origin_item: 'I9',
      order_number: '147042',
      product_id: 'GT-30',
      description: 'Gable Trim 30"',
      machine: 'Press Brake',
      source: 'wrapping',
      remanufacturing_qty: 3,
      note: 'Dented on the bench',
      status: 'not_started',
      requested_by: 'Kevin Fehr',
      created_at: '2026-11-02T10:00:00+00:00'
    },
    {
      id: 32,
      order: 'ORD8',
      origin_item: 'I8',
      order_number: '147098',
      product_id: 'RC-4',
      description: 'Ridge Cap 4',
      machine: 'Press Brake',
      source: 'machine',
      remanufacturing_qty: 2,
      note: null,
      status: 'cut',
      requested_by: 'Press Brake',
      created_at: '2026-11-01T08:00:00+00:00'
    }
  ]
}

const signIn = async (page: Page) => {
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
}

const summaryAsked: URLSearchParams[] = []

test.beforeEach(async ({ page }) => {
  summaryAsked.length = 0
  await page.clock.setFixedTime(new Date('2026-11-04T09:00:00'))
  await mockAuthApi(page)
  await page.route(`${API_URL}/departments/all/`, route => route.fulfill({ json: DEPARTMENTS }))
  await page.route(`${API_URL}/spoiled-parts/summary/*`, route => {
    summaryAsked.push(new URL(route.request().url()).searchParams)
    return route.fulfill({ json: SUMMARY })
  })
  await page.route(`${API_URL}/spoiled-parts/?*`, route => route.fulfill({ json: SPOILED }))
})

test('the report opens on this month for the first department, per machine', async ({ page }) => {
  await page.goto('/reports')
  await signIn(page)

  await expect(page.getByRole('button', { name: 'Trim' })).toHaveAttribute('aria-pressed', 'true')
  // Shipping runs no machines.
  await expect(page.getByRole('button', { name: 'Shipping' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'From' })).toHaveText('Sun, Nov 1, 2026')
  await expect(page.getByRole('button', { name: 'To' })).toHaveText('Wed, Nov 4, 2026')
  await expect
    .poll(() => summaryAsked.at(-1)?.toString())
    .toBe('department_id=1&date_from=2026-11-01&date_to=2026-11-04')

  const rows = page.getByRole('row')
  await expect(rows.filter({ hasText: 'Press Brake' })).toContainText('3.5')
  await expect(rows.filter({ hasText: 'No machine' })).toBeVisible()
  const totals = rows.filter({ hasText: 'All machines' })
  await expect(totals).toContainText('6.5')
  await expect(totals.getByRole('button', { name: 'Remakes on All machines: 2' })).toBeVisible()
  // A machine's remakes open too: they count on the line's machine.
  await expect(page.getByRole('button', { name: 'Remakes on Press Brake: 2' })).toBeVisible()
})

test('a machine’s spoiled count lists that machine’s parts only', async ({ page }) => {
  await page.goto('/reports')
  await signIn(page)

  await page.getByRole('button', { name: 'Spoiled parts on Press Brake: 2' }).click()
  const dialog = page.getByRole('dialog', { name: 'Spoiled parts · Press Brake' })
  await expect(dialog.getByRole('row').filter({ hasText: 'Ridge Cap' })).toHaveCount(2)
  await expect(dialog.getByText('Ridge Cap 3')).toBeVisible()
  await expect(dialog.getByText('Ridge Cap 2')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Close' }).click()

  // What came from no machine has a list of its own too.
  await page.getByRole('button', { name: 'Spoiled parts on No machine: 1' }).click()
  const none = page.getByRole('dialog', { name: 'Spoiled parts · No machine' })
  await expect(none.getByRole('row').filter({ hasText: 'Ridge Cap' })).toHaveCount(1)
  await expect(none.getByText('Ridge Cap 4')).toBeVisible()
})

test('the remakes figures list the period’s remakes, on all machines or one', async ({ page }) => {
  const asked: URLSearchParams[] = []
  await page.route(`${API_URL}/remanufacturings/?*`, route => {
    asked.push(new URL(route.request().url()).searchParams)
    return route.fulfill({ json: REMAKES })
  })
  await page.goto('/reports')
  await signIn(page)

  await page.getByRole('button', { name: 'Remakes on All machines: 2' }).click()
  await expect.poll(() => asked.length).toBe(1)
  expect(asked[0]!.get('department')).toBe('1')
  // Days, not moments: the server takes them as the shop's, as the summary does.
  expect(asked[0]!.get('date_from')).toBe('2026-11-01')
  expect(asked[0]!.get('date_to')).toBe('2026-11-04')
  expect(asked[0]!.has('flow_id')).toBe(false)

  const all = page.getByRole('dialog', { name: 'Remakes · All machines' })
  const kevin = all.getByRole('row').filter({ hasText: 'Kevin Fehr' })
  await expect(kevin).toContainText('Dented on the bench')
  await expect(kevin).toContainText('Wrapping')
  await expect(kevin).toContainText('147042')
  await expect(kevin).toContainText('Gable Trim 30"')
  await page.keyboard.press('Escape')
  await expect(all).toBeHidden()

  // A machine's figure asks the server for that machine's: the list is paged, so it is not narrowed here.
  await page.getByRole('button', { name: 'Remakes on Press Brake: 2' }).click()
  await expect.poll(() => asked.at(-1)?.get('flow_id')).toBe('10')
  await expect(page.getByRole('dialog', { name: 'Remakes · Press Brake' })).toBeVisible()
})

test('another department and a start past the end move the whole period', async ({ page }) => {
  await page.goto('/reports?from=2026-10-01&to=2026-10-10')
  await signIn(page)
  await expect.poll(() => summaryAsked.at(-1)?.get('date_to')).toBe('2026-10-10')

  await page.getByRole('button', { name: 'Rollforming' }).click()
  await expect.poll(() => summaryAsked.at(-1)?.get('department_id')).toBe('2')
  await expect(page).toHaveURL(/department=rollforming/)

  // A start picked after the end takes the end along, so the period never runs backwards.
  await page.getByRole('button', { name: 'From' }).click()
  await page.getByRole('button', { name: /October 20th, 2026/ }).click()
  await expect
    .poll(() => summaryAsked.at(-1)?.toString())
    .toBe('department_id=2&date_from=2026-10-20&date_to=2026-10-20')
})

test('Reports sits under Manage in the menu', async ({ page }) => {
  await page.goto('/reports')
  await signIn(page)

  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByRole('link', { name: 'Reports' }).click()
  await expect(page).toHaveURL(/\/reports/)
})

test('a report that did not load says so, rather than that nothing was spoiled', async ({
  page
}) => {
  await page.route(`${API_URL}/spoiled-parts/summary/*`, route =>
    route.fulfill({ status: 500, json: { detail: 'Server error' } })
  )
  await page.goto('/reports')
  await signIn(page)

  await expect(page.getByText('The report did not load')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Nothing spoiled or remade')).toHaveCount(0)
})
