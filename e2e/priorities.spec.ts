import { expect, test, type Page } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const DEPARTMENTS = [
  { id: 1, name: 'Trim', code: 'trim', position: 1 },
  { id: 2, name: 'Rollforming', code: 'rollforming', position: 2 }
]

/** The signed-in user's role in each department, keyed by department id. */
const assign = async (page: Page, roles: Record<number, string>) => {
  await page.route(`${API_URL}/departments/users/assignments/*`, route => {
    const department = Number(new URL(route.request().url()).searchParams.get('department_id'))
    const role = roles[department]
    return route.fulfill({ json: role ? [{ user: user.id, department, role }] : [] })
  })
}

const PRIORITIES = [
  { id: 3, name: 'ASAP', color: '#dc2626', position: 1, department: 1 },
  { id: 4, name: 'By 10:00', color: '#b58608', position: 2, department: 1 },
  { id: 5, name: 'By 3:00', color: '#16a34a', position: 3, department: 1 },
  { id: 9, name: 'Rush', color: '#16a34a', position: 1, department: 2 },
  // No department: on every department's board, so listed and ordered with each.
  { id: 12, name: 'Later', color: '#64748b', position: 4, department: null }
]

/** Answers every `POST /priorities/reorder/` and records the hierarchy each one sent. */
const recordReorders = async (page: Page) => {
  const sent: { department: number | null; ids: number[] }[] = []
  await page.route(`${API_URL}/priorities/reorder/`, route => {
    sent.push(route.request().postDataJSON() as { department: number | null; ids: number[] })
    return route.fulfill({ json: {} })
  })
  return sent
}

/**
 * Moves a row up with the keyboard sensor: Space picks up, arrows move, Space drops. Each step
 * waits for what a screen reader hears, since the rows are measured between them.
 */
const moveUp = async (page: Page, name: string, steps: number, of: number) => {
  const announced = page.getByRole('status')
  const grip = page.getByRole('button', { name: `Move ${name}` })
  await grip.focus()
  await page.keyboard.press('Space')
  // Picking up counts as being over its own place, which may be what is heard last.
  const from = await page
    .getByRole('row')
    .filter({ has: grip })
    .evaluate(row => {
      const body = row.parentElement!
      return [...body.children].indexOf(row) + 1
    })
  await expect(announced).toHaveText(new RegExp(`${name}.* ${from} of ${of}\\.`))
  for (let step = 1; step <= steps; step++) {
    await page.keyboard.press('ArrowUp')
    await expect(announced).toHaveText(`${name} moved to ${from - step} of ${of}.`)
  }
  await page.keyboard.press('Space')
}

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await assign(page, { 1: 'manager', 2: 'manager' })
  await page.route(`${API_URL}/departments/all/`, route => route.fulfill({ json: DEPARTMENTS }))
  await page.route(`${API_URL}/priorities/`, route => route.fulfill({ json: PRIORITIES }))
  await page.goto('/settings/priorities')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
})

test('every department’s priorities are listed under All, each naming its own', async ({
  page
}) => {
  await expect(page.getByText('5 priorities')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Later' })).toContainText('Every department')
  await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('row').filter({ hasText: 'Rush' })).toContainText('Rollforming')
  // All holds the hierarchy of the priorities with no department. A department's own are changed under
  // its pill, by its Manager: a Manager at large does not touch them here.
  await expect(page.getByRole('button', { name: 'Move Later' })).toHaveAttribute(
    'aria-disabled',
    'false'
  )
  await expect(page.getByRole('button', { name: 'Move Rush' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Delete Rush' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Delete Later' })).toBeVisible()
})

test('a department pill lists its priorities in hierarchy order', async ({ page }) => {
  await page.getByRole('button', { name: 'Trim' }).click()

  await expect(page).toHaveURL(/department=trim/)
  await expect(page.getByText('4 priorities in Trim')).toBeVisible()
  await expect(page.getByText('Rush')).toBeHidden()
  const rows = page.getByRole('row')
  await expect(rows.nth(1)).toContainText('ASAP')
  await expect(rows.nth(3)).toContainText('By 3:00')
})

test('moving a priority saves its department’s hierarchy in one call', async ({ page }) => {
  const sent = await recordReorders(page)
  await page.getByRole('button', { name: 'Trim' }).click()

  await moveUp(page, 'By 3:00', 2, 4)

  await expect.poll(() => sent).toEqual([{ department: 1, ids: [5, 3, 4] }])
})

test('a move the server refuses goes back, and says so', async ({ page }) => {
  await page.route(`${API_URL}/priorities/*/`, route =>
    route.fulfill({ status: 500, json: { detail: 'Server error' } })
  )
  await page.getByRole('button', { name: 'Trim' }).click()

  await moveUp(page, 'By 3:00', 1, 4)

  await expect(page.getByText('The order was not saved')).toBeVisible()
  const rows = page.getByRole('row')
  await expect(rows.nth(2)).toContainText('By 10:00')
  await expect(rows.nth(3)).toContainText('By 3:00')
  // The grip keeps the focus through the save, so the keyboard can carry on from the same row.
  await expect(page.getByRole('button', { name: 'Move By 3:00' })).toBeFocused()
})

test('a row is picked up anywhere along it, not only by the grip', async ({ page }) => {
  const sent = await recordReorders(page)
  await page.getByRole('button', { name: 'Trim' }).click()

  const from = (await page.getByRole('cell', { name: 'By 3:00', exact: true }).boundingBox())!
  const to = (await page.getByRole('cell', { name: 'ASAP', exact: true }).boundingBox())!
  await page.mouse.move(from.x + 10, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + 10, from.y - 10, { steps: 5 })
  await page.mouse.move(from.x + 10, to.y + 2, { steps: 10 })
  await page.mouse.up()

  await expect.poll(() => sent).toEqual([{ department: 1, ids: [5, 3, 4] }])
})

test('a new priority takes a palette colour and goes last in the department on screen', async ({
  page
}) => {
  const posted: Record<string, unknown>[] = []
  await page.route(`${API_URL}/priorities/`, async route => {
    if (route.request().method() === 'POST') {
      posted.push(route.request().postDataJSON() as Record<string, unknown>)
      return route.fulfill({
        json: { id: 11, name: 'NOW', color: '#dc2626', position: 1, department: 2 }
      })
    }
    return route.fulfill({ json: PRIORITIES })
  })

  await page.getByRole('button', { name: 'Rollforming' }).click()
  await page.getByRole('button', { name: 'Add priority' }).click()
  await page.getByLabel('Name').fill('NOW')
  // The swatch is what is clicked; the radio inside it is there for the keyboard and screen readers.
  await page.getByTitle('Blue').click()
  await expect(page.getByRole('radio', { name: 'Blue' })).toBeChecked()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect.poll(() => posted[0]?.department).toBe(2)
  await expect.poll(() => posted[0]?.position).toBe(5)
  await expect.poll(() => posted[0]?.color).toBe('#2563eb')
})

test('deleting one says what it costs', async ({ page }) => {
  await page.getByRole('button', { name: 'Trim' }).click()
  await page.getByRole('button', { name: 'Delete ASAP' }).click()

  await expect(page.getByText('Delete priority ASAP?')).toBeVisible()
  await expect(page.getByText(/sort as unprioritised/)).toBeVisible()
})

test('a Worker reads a department’s priorities but cannot change them', async ({ page }) => {
  await assign(page, { 1: 'worker' })
  await page.getByRole('button', { name: 'Trim' }).click()

  await expect(page.getByText('4 priorities in Trim')).toBeVisible()
  await expect(page.getByText('only a Manager changes them')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add priority' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Move ASAP' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Delete ASAP' })).toBeHidden()
})
