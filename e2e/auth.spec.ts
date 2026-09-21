import { expect, test, type Page } from '@playwright/test'
import { mockAuthApi, password, user } from './api.ts'

const signIn = async (page: Page) => {
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
})

test('guarded page redirects to login and returns after signing in', async ({ page }) => {
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login\?redirect=/)

  await signIn(page)

  await expect(page).toHaveURL('/profile')
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
  await expect(page.getByText(user.email)).toBeVisible()
})

test('logging out clears the session', async ({ page }) => {
  await page.goto('/login')
  await signIn(page)
  await expect(page).toHaveURL('/profile')

  await page.getByRole('button', { name: 'Log out' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login/)
})
