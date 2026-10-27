import { expect, test, type Route } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const HOLIDAYS: Record<number, { id: number; date: string; name: string }[]> = {
  2026: [
    { id: 1, date: '2026-12-25', name: 'Christmas Day' },
    { id: 2, date: '2026-12-26', name: 'Boxing Day' }
  ],
  2027: []
}

const WORKING_DAYS: Record<number, { id: number; date: string; name: string }[]> = {
  2026: [{ id: 7, date: '2026-10-17', name: 'Saturday shift' }],
  2027: []
}

const byYear = (lists: typeof HOLIDAYS) => (route: Route) => {
  const year = Number(new URL(route.request().url()).searchParams.get('year'))
  return route.fulfill({ json: lists[year] ?? [] })
}

/** Every day of the asked year as `GET /work-calendar/` reads it, over a Monday-to-Friday week. */
const fulfillCalendar = (route: Route) => {
  const year = Number(new URL(route.request().url()).searchParams.get('start')?.slice(0, 4))
  const days = []
  for (let day = new Date(Date.UTC(year, 0, 1)); day.getUTCFullYear() === year;) {
    const date = day.toISOString().slice(0, 10)
    const weekday = day.getUTCDay() || 7
    const holiday = HOLIDAYS[year]?.find(row => row.date === date)?.name ?? null
    const working = WORKING_DAYS[year]?.find(row => row.date === date)?.name ?? null
    days.push({
      date,
      weekday,
      is_work_day: !holiday && (!!working || weekday <= 5),
      holiday,
      working_day: working
    })
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return route.fulfill({ json: days })
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-25T09:00:00'))
  await mockAuthApi(page)
  await page.route(`${API_URL}/holidays/?*`, byYear(HOLIDAYS))
  await page.route(`${API_URL}/working-days/?*`, byYear(WORKING_DAYS))
  await page.route(`${API_URL}/work-calendar/?*`, fulfillCalendar)
  await page.route(`${API_URL}/profiles/company/`, route =>
    route.fulfill({ json: { working_weekend: false, work_days: [1, 2, 3, 4, 5] } })
  )
  await page.goto('/settings/work-days')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
})

test('the calendar marks the year’s holidays and working days, and steps between years', async ({
  page
}) => {
  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Fri, Dec 25, 2026 · off · Christmas Day' })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Sat, Oct 17, 2026 · work day · Saturday shift' })
  ).toBeVisible()

  await page.getByRole('button', { name: 'Next year' }).click()
  await expect(page).toHaveURL(/year=2027/)
  await expect(page.getByRole('heading', { name: '2027' })).toBeVisible()
  await page.getByRole('button', { name: 'This year' }).click()
  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible()
})

test('a month’s weeks start on Sunday', async ({ page }) => {
  // Seven headings, then the 1st: Feb 1, 2026 is a Sunday, Oct 1 a Thursday after four blanks.
  const cells = (month: string) => page.getByRole('region', { name: month }).locator('.grid > *')
  await expect(cells('February').first()).toHaveText('Su')
  await expect(cells('February').nth(7)).toHaveText('1')
  await expect(cells('October').nth(11)).toHaveText('1')
})

test('a Saturday picked on the calendar opens as a working day with its name', async ({ page }) => {
  let sent: unknown
  await page.route(`${API_URL}/work-calendar/2026-10-24/`, route => {
    sent = route.request().postDataJSON()
    return route.fulfill({
      json: {
        date: '2026-10-24',
        weekday: 6,
        is_work_day: true,
        holiday: null,
        working_day: 'Saturday shift'
      }
    })
  })

  await page.getByRole('button', { name: 'Sat, Oct 24, 2026 · off' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('switch', { name: 'Work day' }).click()
  await dialog.getByLabel('Working day name').fill('Saturday shift')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(dialog).toBeHidden()
  expect(sent).toEqual({ is_work_day: true, name: 'Saturday shift' })
})

test('closing a day with work on it says what is scheduled there', async ({ page }) => {
  await page.route(`${API_URL}/departments/all/`, route =>
    route.fulfill({
      json: [
        { id: 1, name: 'Trim', code: 'trim' },
        { id: 2, name: 'Rollforming', code: 'rollforming' },
        { id: 4, name: 'Shipping', code: 'shipping' }
      ]
    })
  )
  await page.route(`${API_URL}/departments/*/day-strip/?*`, route => {
    const trim = route.request().url().includes('/departments/1/')
    return route.fulfill({
      json: [
        trim
          ? { date: '2026-10-30', used: 73, capacity_unit: 'bends' }
          : { date: '2026-10-30', used: 0, capacity_unit: 'linear_feet' }
      ]
    })
  })

  await page.getByRole('button', { name: 'Fri, Oct 30, 2026 · work day' }).click()
  const dialog = page.getByRole('dialog')
  const warning = dialog.getByText(/^Already scheduled on this day/)
  await expect(warning).toBeHidden()

  await dialog.getByRole('switch', { name: 'Work day' }).click()
  // Only a line with work there is named.
  await expect(warning).toHaveText(
    'Already scheduled on this day: 73 bends in Trim. Closing it leaves that work there until it is rescheduled.'
  )
  await expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled()
})

test('the list counts the year’s holidays and working days', async ({ page }) => {
  await page.getByRole('tab', { name: 'List' }).click()

  await expect(page).toHaveURL(/view=list/)
  await expect(page.getByRole('row', { name: /Christmas Day/ })).toContainText('Fri, Dec 25, 2026')
  await expect(page.getByText('2 holidays · 1 working day')).toBeVisible()

  await page.getByRole('button', { name: 'Next year' }).click()
  await expect(page.getByText('No holidays or working days in 2027')).toBeVisible()
})

test('adds a holiday with the date and name the server expects', async ({ page }) => {
  let posted: unknown
  await page.route(`${API_URL}/holidays/`, route => {
    posted = route.request().postDataJSON()
    return route.fulfill({ json: { id: 3, ...(posted as object) } })
  })

  await page.getByRole('tab', { name: 'List' }).click()
  await page.getByRole('button', { name: 'Add day' }).click()
  const dialog = page.getByRole('dialog')
  // A new day this year starts on today.
  await expect(dialog.getByLabel('Date')).toHaveText(/Fri, Sep 25, 2026/)
  await dialog.getByLabel('Name').fill('  Thanksgiving  ')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual({ date: '2026-09-25', name: 'Thanksgiving' })
})

test('a date that already has a holiday keeps the dialog open with the server’s reason', async ({
  page
}) => {
  await page.route(`${API_URL}/holidays/`, route =>
    route.fulfill({ status: 409, json: { detail: '2026-09-25 is already a holiday.' } })
  )

  await page.getByRole('tab', { name: 'List' }).click()
  await page.getByRole('button', { name: 'Add day' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add holiday or working day' })
  await dialog.getByLabel('Name').fill('Duplicate')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('2026-09-25 is already a holiday.')).toBeVisible()
  await expect(dialog).toBeVisible()
})

test('deleting a holiday asks first', async ({ page }) => {
  let deleted = false
  await page.route(`${API_URL}/holidays/1/`, route => {
    deleted = route.request().method() === 'DELETE'
    return route.fulfill({ status: 204 })
  })

  await page.getByRole('tab', { name: 'List' }).click()
  await page.getByRole('button', { name: 'Delete Christmas Day' }).click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('becomes a work day again')
  await confirm.getByRole('button', { name: 'Delete' }).click()

  await expect(confirm).toBeHidden()
  expect(deleted).toBe(true)
})

test('a holiday saved into another year opens that year', async ({ page }) => {
  await page.route(`${API_URL}/holidays/1/`, route =>
    route.fulfill({ json: { id: 1, date: '2027-12-25', name: 'Christmas Day' } })
  )

  await page.getByRole('tab', { name: 'List' }).click()
  await page.getByRole('button', { name: 'Edit Christmas Day' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit holiday' })
  await dialog.getByLabel('Date').click()
  await page.getByRole('combobox', { name: /year/i }).selectOption('2027')
  await page.getByRole('button', { name: /December 25th, 2027/ }).click()
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page).toHaveURL(/year=2027/)
  await expect(page.getByRole('heading', { name: '2027' })).toBeVisible()
})

test('a calendar that did not load says so', async ({ page }) => {
  await page.route(`${API_URL}/work-calendar/?*`, route =>
    route.fulfill({ status: 500, json: { detail: 'boom' } })
  )
  await page.getByRole('button', { name: 'Next year' }).click()

  await expect(page.getByText('The work days of 2027 did not load')).toBeVisible()
})
