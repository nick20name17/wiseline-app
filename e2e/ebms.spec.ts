import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const write = (overrides: Record<string, unknown>) => ({
  id: 1,
  created_at: '2026-11-05T14:00:00+00:00',
  kind: 'order_complete',
  entity: 'INMFG',
  autoid: 'X',
  body: {},
  order: null,
  order_number: null,
  department_id: 1,
  lot_autoid: null,
  lot_number: null,
  coil: null,
  created_by: null,
  status: 'failed',
  attempts: 1,
  next_attempt_at: '2026-11-05T14:30:00+00:00',
  sent_at: null,
  last_error: null,
  ...overrides
})

const FAILED = [
  write({
    id: 8,
    order: 'ARINV-9',
    order_number: '147553',
    created_by: 'Kevin Fehr',
    last_error: 'Not Open in EBMS (status O)'
  }),
  write({
    id: 9,
    kind: 'ship_date',
    body: { SHIP_DATE: '2026-11-07' },
    order: 'ARINV-4',
    order_number: '147600',
    last_error: 'Invoiced in EBMS'
  })
]

const QUEUED = [
  write({
    id: 11,
    kind: 'coil_adjust',
    status: 'queued',
    body: { LOT_COUNT: 1200 },
    lot_autoid: 'LOT-1',
    lot_number: '37094536',
    coil: { product_id: 'GAL26', color: 'Galvalume', gauge: 26, width: 48 },
    created_by: 'Slinet'
  })
]

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  const asked: Record<string, unknown[]> = { failed: FAILED, queued: QUEUED, ok: [] }
  await page.route(`${API_URL}/ebms-outbox/?*`, route => {
    const params = new URL(route.request().url()).searchParams
    const results = asked[params.get('status') ?? ''] ?? []
    const limit = Number(params.get('limit'))
    return route.fulfill({ json: { count: results.length, results: results.slice(0, limit) } })
  })
  await page.goto('/settings/ebms')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
})

test('the queue opens on what EBMS refused, each tab counted', async ({ page }) => {
  await expect(page.getByRole('tab', { name: /^Failed/ })).toContainText('2')
  await expect(page.getByRole('tab', { name: /^Queued/ })).toContainText('1')

  const complete = page.getByRole('row').filter({ hasText: '147553' })
  await expect(complete).toContainText('Order Complete')
  await expect(complete).toContainText('Kevin Fehr')
  await expect(complete).toContainText('Not Open in EBMS (status O)')
  await expect(page.getByRole('row').filter({ hasText: '147600' })).toContainText(
    'Ship Date Sat, Nov 7, 2026'
  )

  await page.getByRole('tab', { name: /^Queued/ }).click()
  await expect(page).toHaveURL(/status=queued/)
  const coil = page.getByRole('row').filter({ hasText: 'Lot 37094536' })
  await expect(coil).toContainText('Linear Feet to 1,200')
  await expect(coil).toContainText('Galvalume · 26 ga · 48"')
  await expect(coil.getByRole('button', { name: 'Send again' })).toHaveCount(0)
})

test('a refused write is sent again once it is fixed in EBMS', async ({ page }) => {
  const resent: string[] = []
  await page.route(`${API_URL}/ebms-outbox/*/retry/`, route => {
    resent.push(new URL(route.request().url()).pathname)
    return route.fulfill({ json: { ...FAILED[0], status: 'ok', last_error: null } })
  })

  await page
    .getByRole('row')
    .filter({ hasText: '147553' })
    .getByRole('button', { name: 'Send again' })
    .click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('EBMS refused Order Complete of order 147553')
  await confirm.getByRole('button', { name: 'Send again' }).click()

  await expect.poll(() => resent).toEqual(['/ebms-outbox/8/retry/'])
  await expect(page.getByText('Sent to EBMS')).toBeVisible()
})
