import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

const OPTIONS = [
  {
    product_id: 'TSG8306',
    description: 'Gable trim',
    color: 'Black',
    gauge: '26',
    has_card: false
  },
  { product_id: 'TSG8307', description: 'Gable trim', color: 'White', gauge: '26', has_card: true }
]

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.route(`${API_URL}/stock-cards/`, route => route.fulfill({ json: [] }))
})

test('the Product ID is picked from EBMS by ID or description', async ({ page }) => {
  const searched: string[] = []
  await page.route(`${API_URL}/stock-cards/products/?*`, route => {
    searched.push(new URL(route.request().url()).searchParams.get('search') ?? '')
    return route.fulfill({ json: OPTIONS })
  })
  await page.route(`${API_URL}/stock-cards/product/TSG8306/`, route =>
    route.fulfill({ json: { ...OPTIONS[0], width_from_orders: 8 } })
  )
  await page.goto('/stock-cards')
  await signIn(page)

  await page.getByRole('button', { name: 'Create stock card' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Product ID').fill('gable')
  await expect.poll(() => searched.at(-1)).toBe('gable')

  // A product that already has a card cannot be picked again.
  await expect(page.getByRole('option', { name: /TSG8307/ })).toHaveAttribute(
    'aria-disabled',
    'true'
  )
  await page.getByRole('option', { name: /TSG8306/ }).click()

  await expect(dialog.getByLabel('Product ID')).toHaveValue('TSG8306')
  await expect(dialog.getByText('Gable trim — Black · 26 ga')).toBeVisible()
  // The width the product's orders agree on fills in from the lookup.
  await expect(dialog.getByLabel('Width')).toHaveValue('8')
})
