import { expect, test } from '@playwright/test'

import { asRole } from './support'

/**
 * The root is the only URL a host chooses for you — the review portal frames a build at `/` — and it
 * is the one URL the prototype never links to, which is how it stayed a 404 for a whole port.
 */
test('the root sends a visitor to sign in', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('the root sends a signed-in Worker to their own floor', async ({ page }) => {
  await asRole(page, 'worker', 'all')
  await page.goto('/')
  await expect(page).toHaveURL(/\/trim\?view=production$/)
})

test('the root keeps a scoped viewer on their department', async ({ page }) => {
  await asRole(page, 'manager', 'accessories')
  await page.goto('/')
  await expect(page).toHaveURL(/\/accessories(\?|$)/)
})
