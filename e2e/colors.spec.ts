import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi, password, user } from './api.ts'

const COLORS = [
  { id: null, name: 'Charcoal', hex: null, coil_colors: [], coil_products: [], in_ebms: true },
  {
    id: 4,
    name: 'Black',
    hex: '#111111',
    coil_colors: ['Black 8262'],
    coil_products: [],
    in_ebms: true
  }
]

const COIL_OPTIONS = {
  coil_colors: [
    { text: '26GA. Charcoal', coils: 14, color: null },
    { text: 'Charcoal Lynx', coils: 10, color: null },
    { text: 'Black 8262', coils: 7, color: 'Black' },
    { text: 'Tan', coils: 3, color: null }
  ],
  coil_products: [{ product_id: 'CS268315', description: '26GA TAN', color: null }]
}

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await page.route(`${API_URL}/colors/?*`, route =>
    route.fulfill({ json: { count: COLORS.length, results: COLORS } })
  )
  await page.route(`${API_URL}/colors/coil-options/`, route =>
    route.fulfill({ json: COIL_OPTIONS })
  )
  await page.goto('/settings/colors')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
})

test('lists the trim colors with their coils, the unlinked ones a tab away', async ({ page }) => {
  await expect(page.getByRole('row', { name: /Black/ })).toContainText('Black 8262')
  await page.getByRole('tab', { name: /No coils linked · 1/ }).click()
  await expect(page.getByRole('row', { name: /Charcoal/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Black/ })).toBeHidden()
})

test('linking coils suggests by name, never ticks for the Manager, and saves a new color', async ({
  page
}) => {
  let posted: unknown
  await page.route(`${API_URL}/colors/`, route => {
    posted = route.request().postDataJSON()
    return route.fulfill({ json: { id: 9, ...(posted as object), in_ebms: true } })
  })

  await page.getByRole('button', { name: 'Edit Charcoal' }).click()
  const dialog = page.getByRole('dialog', { name: 'Charcoal' })
  const suggested = dialog.getByRole('listitem').filter({ hasText: '26GA. Charcoal' })
  await expect(suggested).toContainText('Suggested')
  await expect(suggested.getByRole('checkbox')).not.toBeChecked()
  // A text another color has is shown, and cannot be taken.
  await expect(
    dialog.getByRole('listitem').filter({ hasText: 'Black 8262' }).getByRole('checkbox')
  ).toBeDisabled()

  await dialog.getByRole('checkbox', { name: /^26GA\. Charcoal ·/ }).click()
  await dialog.getByRole('listitem').filter({ hasText: 'CS268315' }).getByRole('checkbox').click()
  await dialog.getByLabel('Swatch', { exact: true }).fill('#3a3a3c')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual({
    name: 'Charcoal',
    hex: '#3a3a3c',
    coil_colors: ['26GA. Charcoal'],
    coil_products: ['CS268315']
  })
})
