import { expect, test, type Page } from '@playwright/test'
import { mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.goto('/trim')
  await signIn(page)
  await expect(page.getByText('330605')).toBeVisible()
})

/** The Unscheduled table's headings, left to right, service columns included as blanks. */
const headings = (page: Page) =>
  page
    .getByRole('table')
    .first()
    .getByRole('columnheader')
    .evaluateAll(cells => cells.map(cell => cell.textContent?.trim() ?? ''))

const drag = async (page: Page, from: string, onto: string) => {
  const source = (await page.getByRole('columnheader', { name: from, exact: true }).boundingBox())!
  const target = (await page.getByRole('columnheader', { name: onto, exact: true }).boundingBox())!
  await page.mouse.move(source.x + 10, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(source.x + 20, source.y + source.height / 2, { steps: 5 })
  await page.mouse.move(target.x + 10, target.y + target.height / 2, { steps: 10 })
  await page.mouse.up()
}

test('a header dragged onto another takes its place, cells and all, and stays there', async ({
  page
}) => {
  await drag(page, 'Customer', 'Entry')

  await expect(page.getByText('Column order saved')).toBeVisible()
  const moved = ['', '', 'Customer', 'Entry', 'Ship', 'Order #', 'Priority', 'Notes']
  await expect.poll(() => headings(page)).toEqual(moved)
  // The body follows the header: the customer's name is now the first data cell of its row.
  const row = page.getByRole('row').filter({ hasText: '330605' })
  await expect(row.getByRole('cell').nth(2)).toHaveText('H F H Inc')

  await page.reload()
  await expect(page.getByText('330605')).toBeVisible()
  await expect.poll(() => headings(page)).toEqual(moved)
  await expect(row.getByRole('cell').nth(2)).toHaveText('H F H Inc')
})

test('a header moves with the keyboard too', async ({ page }) => {
  const announced = page.getByRole('status')
  await page.getByRole('button', { name: 'Ship', exact: true }).focus()
  await page.keyboard.press('Space')
  // Picking up counts as being over its own place, which may be what is heard last.
  await expect(announced).toHaveText(/Ship.* 2 of 6\./)
  await page.keyboard.press('ArrowRight')
  await expect(announced).toHaveText('Column Ship moved to 3 of 6.')
  await page.keyboard.press('Space')

  await expect
    .poll(() => headings(page))
    .toEqual(['', '', 'Entry', 'Order #', 'Ship', 'Priority', 'Customer', 'Notes'])
})
