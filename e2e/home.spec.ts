import { expect, test } from '@playwright/test'

test('home renders the app shell after signing in', async ({ page }) => {
  await page.goto('/')

  // unauthenticated visits are redirected to sign-in (form seeded with demo creds)
  await expect(page).toHaveURL(/\/sign-in/)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveTitle('top-secret')
  await expect(page.getByRole('heading', { name: 'top-secret' })).toBeVisible()
})
