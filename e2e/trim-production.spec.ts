import { expect, test } from '@playwright/test'
import { mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim?view=production')
  await signIn(page)
  await expect(page).toHaveURL(/view=production/)
})

test('the tab opens on the Slinet with its cutlists grouped by day', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Slinet' })).toHaveAttribute('data-active', '')
  await expect(page.getByRole('tab', { name: 'Active cutlists' })).toBeVisible()

  // The date is said once, over the lists that share it.
  await expect(page.getByText('Fri, Sep 18, 2026')).toBeVisible()
  await expect(page.getByText('26ga - Charcoal').first()).toBeVisible()
  // The Slinet cuts; it has no bends and no daily max of its own.
  await expect(page.getByText('Total # Pieces')).toBeVisible()
  await expect(page.getByText('Daily Max (bends)')).toBeHidden()
})

test('a list from a day gone by is marked overdue', async ({ page }) => {
  const overdue = page.getByText('24ga - Galvalume').locator('..')
  await expect(overdue.getByText('Overdue')).toBeVisible()
})

test('the Slinet reads its list sideways — machines as columns, vented in its own', async ({
  page
}) => {
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()

  await expect(page.getByRole('columnheader', { name: 'Press Brake' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Vented' })).toBeVisible()
  // 8 pieces stay on V2 and the 18 vented ones leave its column for the Vented one.
  const row = page.getByRole('row').filter({ hasText: '96"' })
  await expect(row.getByText('8', { exact: true })).toBeVisible()
  await expect(row.getByText('18', { exact: true })).toBeVisible()
})

test('a total opens the orders behind it', async ({ page }) => {
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()
  await page.getByRole('button', { name: '12', exact: true }).click()

  await expect(page.getByRole('dialog').getByText('Orders using this size')).toBeVisible()
  await expect(page.getByRole('dialog').getByText('ARINV-2')).toBeVisible()
})

test('reopening a row asks first, marking one complete does not', async ({ page }) => {
  const patched: string[] = []
  page.on('request', request => {
    if (request.url().includes('/cutlists/rows/')) patched.push(request.method())
  })

  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Show rows' })
    .click()
  await page.getByRole('checkbox', { name: /Complete 12.5/ }).click()

  await expect.poll(() => patched).toEqual(['PATCH'])
  await expect(page.getByText('Mark this row as NOT completed?')).toBeHidden()
})

test('Done waits until every row is complete', async ({ page }) => {
  const outstanding = page.getByText('26ga - Charcoal').first().locator('..')
  await expect(outstanding.getByRole('button', { name: 'Done' })).toBeDisabled()

  const ready = page.getByText('26ga - Bright White').locator('..')
  await ready.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Mark this cutlist done?')).toBeVisible()
  await expect(page.getByText('coil adjustments')).toBeVisible()
})

test('Cutlist Coils lists the coils this colour can be cut from', async ({ page }) => {
  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', { name: 'Cutlist Coils' })
    .click()

  await expect(page.getByRole('dialog').getByText('37067677')).toBeVisible()
  await expect(page.getByRole('dialog').getByText('CS488306')).toBeVisible()
})

test('a machine tab holds its own bendlists, with its daily max', async ({ page }) => {
  await page.getByRole('tab', { name: 'Press Brake' }).click()

  await expect(page.getByRole('tab', { name: 'Active bendlists' })).toBeVisible()
  await expect(page.getByText('Daily Max (bends)')).toBeVisible()

  await page
    .getByText('26ga - Charcoal')
    .first()
    .locator('..')
    .getByRole('button', {
      name: 'Show rows'
    })
    .click()
  await expect(page.getByRole('columnheader', { name: 'Qty to Manufacture' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Vented' })).toBeHidden()
})

test('the completed lists are a switch away and keep the same format', async ({ page }) => {
  await page.getByRole('tab', { name: /Completed cutlists/ }).click()

  await expect(page.getByText('26ga - Bright White')).toBeVisible()
  await expect(page.getByText('Done', { exact: true })).toBeVisible()
  // A finished list is not late and has nothing left to act on.
  await expect(page.getByRole('button', { name: 'Cutlist Coils' })).toBeHidden()
})
