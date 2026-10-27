import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { HOLIDAY, mockTrimApi, SCHEDULED_ORDERS, signIn } from './trim-api.ts'

// The reviewed order on Wed, Sep 23, whose one line the split below is drawn from.
const READY = SCHEDULED_ORDERS[2]!
const LINE = READY.origin_items[0]!

const line = (id: string, day: string) => ({
  ...LINE,
  id,
  production_date: day,
  item: { ...LINE.item, id: Number(id), production_date: day }
})

/** Split across two days: it is on the calendar on both. */
const SPLIT_ORDER = {
  ...READY,
  id: 'ARINV-9',
  invoice: '330700',
  customer: 'Split Contracting',
  origin_items: [line('201', '2026-09-24'), line('202', '2026-09-25')]
}

const ORDERS = [...SCHEDULED_ORDERS, SPLIT_ORDER]

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.route(`${API_URL}/ebms/orders/*`, route => {
    const scheduled = new URL(route.request().url()).searchParams.get('is_scheduled') === 'true'
    if (!scheduled) return route.fallback()
    return route.fulfill({ json: { count: ORDERS.length, results: ORDERS } })
  })
  await page.goto('/trim?view=calendar')
  await signIn(page)
  await expect(page).toHaveURL(/view=calendar/)
})

test('the month shows how many orders each production day carries', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'September 2026' })).toBeVisible()
  // Three of the scheduled fixtures sit on Wed, Sep 23.
  const today = page.getByRole('button', { name: 'Wed, Sep 23, 2026' })
  await expect(today).toContainText('3 ord')
  await expect(today.getByText('3 ord')).toHaveAttribute('title', /bends scheduled$/)
  // The split order counts on each of its days.
  await expect(page.getByRole('button', { name: 'Thu, Sep 24, 2026' })).toContainText('1 ord')
  await expect(page.getByRole('button', { name: 'Fri, Sep 25, 2026' })).toContainText('1 ord')
})

test('a day opens under the month with the orders on it', async ({ page }) => {
  await page.getByRole('button', { name: 'Wed, Sep 23, 2026' }).click()

  await expect(page.getByText('3 orders scheduled')).toBeVisible()
  await expect(page.getByRole('button', { name: /330608.*Reviewed/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /330615.*Scheduled/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open in Scheduled' })).toBeVisible()
})

test('an empty day says so and leads nowhere', async ({ page }) => {
  await page.getByRole('button', { name: 'Sat, Sep 26, 2026' }).click()

  await expect(page.getByText('Nothing scheduled for this day.')).toBeVisible()
  await expect(page.getByText(/non-work day/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open in Scheduled' })).toBeHidden()

  await page.getByRole('button', { name: 'Today' }).click()
  await expect(page.getByText(/· today/)).toBeVisible()
})

test('a holiday names itself on the month and under it', async ({ page }) => {
  const day = page.getByRole('button', { name: `Wed, Sep 30, 2026 · ${HOLIDAY.name}` })
  await expect(day).toContainText(HOLIDAY.name)

  await day.click()
  await expect(page.getByText(`${HOLIDAY.name}, closed`)).toBeVisible()
})

test('the day leads back to the board', async ({ page }) => {
  await page.getByRole('button', { name: 'Wed, Sep 23, 2026' }).click()
  await page.getByRole('button', { name: /330608/ }).click()

  await expect(page).toHaveURL(/view=scheduled/)
})
