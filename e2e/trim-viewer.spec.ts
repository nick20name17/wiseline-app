import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi, user } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

// A salesperson: the global `client` role reads every board as View only, whatever the assignments.
test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.route(`${API_URL}/users/${user.id}/`, route =>
    route.fulfill({ json: { ...user, role: 'client' } })
  )
  await page.goto('/trim?view=unscheduled')
  await signIn(page)
  await expect(page).toHaveURL(/view=unscheduled/)
})

test('View only reads the Unscheduled tab without its writes', async ({ page }) => {
  await expect(page.getByText('View only')).toBeVisible()
  await expect(page.getByText('330605')).toBeVisible()
  await expect(page.getByLabel('Select order 330605')).toBeDisabled()
  await expect(page.getByRole('button', { name: /^Schedule/ })).toBeHidden()
  await expect(page.getByRole('button', { name: /Bypass Production/ })).toBeHidden()
  await expect(page.getByRole('button', { name: /Create stock order/ })).toBeHidden()
})

test('View only reads the Scheduled tab without Reviewed or Release', async ({ page }) => {
  await page.goto('/trim?view=scheduled')
  await page.getByRole('button', { name: /All Scheduled Orders/ }).click()
  await expect(page.getByText('330608')).toBeVisible()
  await expect(page.getByLabel('Reviewed 330615')).toBeDisabled()
  await expect(page.getByLabel('Select order 330608 for release')).toBeHidden()
  await expect(page.getByRole('button', { name: /Release to production/ })).toBeHidden()
})

test('View only reads the Production lists without Done', async ({ page }) => {
  await page.goto('/trim?view=production')
  const main = page.getByRole('main')
  await expect(main.getByText('26ga - Charcoal').first()).toBeVisible()
  await expect(main.getByRole('button', { name: 'Done' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Stock Manufacturing/ })).toBeHidden()
})
