import { expect, test } from '@playwright/test'
import { mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim?view=coils')
  await signIn(page)
  await expect(page).toHaveURL(/view=coils/)
})

test('the tab opens on the coils standing in Trim', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Trim coils' })).toHaveAttribute('data-active', '')
  await expect(page.getByText('3782201')).toBeVisible()
  await expect(page.getByText('3797401')).toBeHidden()

  await page.getByRole('tab', { name: 'All coils' }).click()
  await expect(page.getByText('3797401')).toBeVisible()
})

test('a coil in Rollforming cannot also be in Trim, and the Slinet waits on a thickness', async ({
  page
}) => {
  await page.getByRole('tab', { name: 'All coils' }).click()

  // 3782201 is in Trim with a thickness: the Slinet is open, Rollforming is shut.
  await expect(page.getByRole('checkbox', { name: /Slinet holds coil 3782201/ })).toBeEnabled()
  await expect(
    page.getByRole('checkbox', { name: /Rollforming holds coil 3782201/ })
  ).toBeDisabled()
  // 3797401 has no thickness, so the Slinet stays shut whatever else is ticked.
  await expect(page.getByRole('checkbox', { name: /Slinet holds coil 3797401/ })).toBeDisabled()
})

test('the search narrows the list to one coil', async ({ page }) => {
  await page.getByRole('tab', { name: 'All coils' }).click()
  await page.getByLabel('Search coils').fill('CB4828B')

  await expect(page.getByText('3797401')).toBeVisible()
  await expect(page.getByText('3782201')).toBeHidden()
})

test('a figure opens the adjustment window, and the answer is confirmed before it goes', async ({
  page
}) => {
  await page.getByRole('button', { name: /Adjust coil 3782201/ }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Coil adjustment')).toBeVisible()
  await dialog.getByLabel('Linear Feet').fill('1200')
  await dialog.getByRole('button', { name: 'Apply' }).click()

  await expect(page.getByText('Make adjustment?')).toBeVisible()
  await expect(page.getByText(/pushes the new Linear Feet to EBMS/)).toBeVisible()
})

test('the coil filter says which coils reach this department', async ({ page }) => {
  await page.getByRole('button', { name: 'Coil filter' }).click()

  await expect(page.getByText('26 Ga. B&B Coils')).toBeVisible()
  await expect(page.getByText(/Thickness 0.015–0.02/)).toBeVisible()
})
