import { expect, test } from '@playwright/test'

import { asRole, at } from './support'

/**
 * What a board hides from a Worker.
 *
 * Every one of these was broken at once, and invisibly: the boards read their role from a seed that never
 * changed, so the app only ever rendered the Manager's version of itself. Two of them broke again the
 * same afternoon, from a `store.get()` in render — the value froze and no click could move it. They are
 * asserted here because a screenshot of a Manager cannot fail for any of them.
 */

test('a Worker on Trim sees Production and Coils, and no board above them', async ({ page }) => {
  await asRole(page, 'worker', 'trim')
  await page.goto('/trim?view=home')

  // asking for the Manager's first tab as a Worker lands on the Worker's first
  await expect(page).toHaveURL(/view=production/)

  await expect(at(page, 'tab-production')).toBeVisible()
  await expect(at(page, 'tab-coils')).toBeVisible()
  await expect(at(page, 'tab-unscheduled')).toBeHidden()
  await expect(at(page, 'tab-scheduled')).toBeHidden()
  await expect(at(page, 'tab-calendar')).toBeHidden()
})

test('the Coil Filter is the Manager\'s to set and the Worker\'s to work within', async ({ page }) => {
  await asRole(page, 'manager', 'trim')
  await page.goto('/trim?view=coils')
  await expect(at(page, 'coils-filter-btn')).toBeVisible()

  await asRole(page, 'worker', 'trim')
  await page.goto('/trim?view=coils')
  // the folders and their ranges are still there; only the button that would change them is gone
  await expect(at(page, 'coils-folder-all')).toBeVisible()
  await expect(at(page, 'coils-filter-btn')).toHaveCount(0)
})

test('a Worker on Accessories gets Packaging and nothing else', async ({ page }) => {
  await asRole(page, 'worker', 'accessories')
  await page.goto('/accessories?view=unscheduled')

  await expect(page).toHaveURL(/view=packaging/)
  await expect(at(page, 'tab-packaging')).toBeVisible()
  await expect(at(page, 'tab-unscheduled')).toBeHidden()
  await expect(at(page, 'tab-completed')).toBeHidden()
})

test('a Manager can set a priority and a Worker cannot', async ({ page }) => {
  await asRole(page, 'manager', 'trim')
  await page.goto('/trim?view=home')

  const cell = at(page, 'priority-1')
  await cell.click()
  await expect(at(page, 'dropdown-popover')).toBeVisible()

  // the list is read by colour before it is read by name, so every row carries its own swatch
  await expect(page.locator('.pop .pri-dot')).toHaveCount(await page.locator('.pop-item').count())

  const picked = await at(page, 'dropdown-item-0').innerText()
  await at(page, 'dropdown-item-0').click()
  await expect(cell).toHaveText(new RegExp(picked, 'i'))

  await asRole(page, 'worker', 'trim')
  await page.goto('/trim?view=production')
  const readOnly = page.locator('.pri.readonly').first()
  await expect(readOnly).toBeVisible()
  await readOnly.click()
  await expect(at(page, 'dropdown-popover')).toHaveCount(0)
})
