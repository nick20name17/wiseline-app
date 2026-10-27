import { expect, test, type Page } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const signIn = async (page: Page) => {
  await page.getByLabel('Email').fill(user.email)
  // Exact: the show/hide toggle's own label also contains the word.
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
}

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
})

test('guarded page redirects to login and returns after signing in', async ({ page }) => {
  await page.goto('/rollforming')
  await expect(page).toHaveURL(/\/login\?redirect=/)

  await signIn(page)

  await expect(page).toHaveURL(/\/rollforming/)
})

test('a worker without an email signs in with a login word', async ({ page }) => {
  const sent: unknown[] = []
  await page.route(`${API_URL}/token/`, route => {
    sent.push(route.request().postDataJSON())
    return route.fallback()
  })
  await page.goto('/rollforming')

  await page.getByLabel('Email or login').fill('jsmith')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page).toHaveURL(/\/rollforming/)
  expect(sent).toEqual([{ email: 'jsmith', password }])
})

const DEPARTMENTS = [
  { id: 1, name: 'Trim', code: 'trim' },
  { id: 2, name: 'Rollforming', code: 'rollforming' },
  { id: 3, name: 'Accessories', code: 'accessories' },
  { id: 4, name: 'Shipping', code: 'shipping' }
]

// The user's assignments, one department each; the server is asked about one department at a time.
const assign = async (page: Page, roles: Record<number, string>) => {
  await page.route(`${API_URL}/departments/all/`, route => route.fulfill({ json: DEPARTMENTS }))
  await page.route(`${API_URL}/departments/users/assignments/*`, route => {
    const department = Number(new URL(route.request().url()).searchParams.get('department_id'))
    const role = roles[department]
    void route.fulfill({ json: role ? [{ user: user.id, department, role }] : [] })
  })
}

test('signing in lands on the page the role starts on', async ({ page }) => {
  await page.route(`${API_URL}/users/${user.id}/`, route =>
    route.fulfill({ json: { ...user, role: 'driver' } })
  )
  await assign(page, {})
  await page.goto('/login')
  await signIn(page)

  await expect(page).toHaveURL(/\/driver/)
})

test('a department the user is not in is neither offered nor opened by its URL', async ({
  page
}) => {
  await page.route(`${API_URL}/users/${user.id}/`, route =>
    route.fulfill({ json: { ...user, role: 'worker' } })
  )
  await assign(page, { 2: 'worker' })
  await page.goto('/login')
  await signIn(page)

  await expect(page).toHaveURL(/\/rollforming/)
  const sidebar = page.locator('[data-sidebar=sidebar]')
  await expect(sidebar.getByRole('link', { name: 'Rollforming' })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Trim' })).toBeHidden()
  await expect(sidebar.getByRole('link', { name: 'Accessories' })).toBeHidden()
  await expect(sidebar.getByRole('link', { name: 'Shipping' })).toBeHidden()
  await expect(sidebar.getByRole('link', { name: 'Settings' })).toBeHidden()
  // A heading whose links are all gone goes too.
  await expect(sidebar.getByText('MANAGE')).toBeHidden()

  await page.goto('/trim')
  await expect(page).toHaveURL(/\/rollforming/)
  await page.goto('/settings/machines')
  await expect(page).toHaveURL(/\/rollforming/)
})

test('logging out clears the session', async ({ page }) => {
  await page.goto('/login')
  await signIn(page)
  await expect(page).toHaveURL(/\/trim/)

  await page.getByRole('button', { name: /Emily Johnson/ }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()

  await expect(page).toHaveURL(/\/login/)
  await page.goto('/trim')
  await expect(page).toHaveURL(/\/login/)
})

test('a visitor sees only the sign-in page, not the dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await page.goto('/trim')
  await expect(page).toHaveURL(/\/login/)
})

test('a session that ends while a page is open sends it to sign in', async ({ page }) => {
  await page.goto('/login')
  await signIn(page)
  await expect(page).toHaveURL(/\/trim/)

  // As another tab logging out does.
  await page.evaluate(() => {
    localStorage.removeItem('session')
    window.dispatchEvent(new StorageEvent('storage', { key: 'session' }))
  })
  await expect(page).toHaveURL(/\/login\?redirect=/)
})
