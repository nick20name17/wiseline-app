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

test('signing in lands on the page the role starts on', async ({ page }) => {
  await page.route(`${API_URL}/users/${user.id}/`, route =>
    route.fulfill({ json: { ...user, role: 'driver', process_types: ['driver'] } })
  )
  await page.goto('/login')
  await signIn(page)

  await expect(page).toHaveURL(/\/driver/)
})

test('logging out clears the session', async ({ page }) => {
  await page.goto('/login')
  await signIn(page)
  await expect(page).toHaveURL(/\/trim/)

  await page.getByRole('button', { name: 'Account' }).click()
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
