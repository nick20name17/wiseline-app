import { expect, test, type Page } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

const coil = (id: number, productId: string, lotNumber: string, extra = {}) => ({
  id: `LOT-${id}`,
  lot_autoid: `LOT-${id}`,
  lot_number: lotNumber,
  product_id: productId,
  coil_thickness: 5.95,
  material_thickness: 0.0179,
  core_od: 20,
  linear_feet: 2260,
  weight: 6608,
  in_trim: false,
  in_rollforming: false,
  in_slinet: false,
  note: null,
  can_adjust: true,
  slinet_available: false,
  rollforming_available: true,
  ...extra
})

const LOTS = [
  // In Trim with a thickness, so the Slinet is open to it; Rollforming is not.
  coil(41, 'CB4826R', '3782201', {
    in_trim: true,
    slinet_available: true,
    rollforming_available: false
  }),
  // No thickness and no build: the Slinet stays shut, and the adjustment is locked.
  coil(42, 'CB4828B', '3797401', {
    coil_thickness: null,
    material_thickness: null,
    can_adjust: false
  }),
  // Standing in Rollforming, and thinner than Trim's filter lets through.
  coil(43, 'CB4828B', '3800001', { coil_thickness: 2.1, in_rollforming: true })
]

// The department-wide row the window writes; Trim Coils are the ones inside it.
const FILTER = {
  id: 7,
  department: 1,
  folder_name: null,
  thickness_min: 5,
  thickness_max: 6,
  width_min: null,
  width_max: null,
  grade_min: null,
  grade_max: null,
  apply_all: false
}

// The list is one row per product; its coils are inside it.
const openProduct = (page: Page, productId: string) =>
  page.getByRole('button', { name: `Coils of ${productId}` }).click()

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  // Registered after the shared mocks, so these answer first.
  await page.route(`${API_URL}/coils/filters/*`, route => route.fulfill({ json: [FILTER] }))
  // `department_id` asks for Trim Coils, which the server narrows by the Coil Filter: 3800001 is
  // thinner than it lets through.
  await page.route(`${API_URL}/coils/lots/?*`, route => {
    const trim = new URL(route.request().url()).searchParams.has('department_id')
    const lots = trim ? LOTS.filter(lot => lot.lot_number !== '3800001') : LOTS
    void route.fulfill({ json: { count: lots.length, results: lots } })
  })
  await page.goto('/trim?view=coils')
  await signIn(page)
  await expect(page).toHaveURL(/view=coils/)
})

test('Trim Coils are the coils inside the Coil Filter, All Coils ignores it', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Trim Coils', exact: true })).toHaveAttribute(
    'data-active',
    ''
  )
  await expect(page.getByText('Coil Filter active')).toBeVisible()
  await openProduct(page, 'CB4826R')
  await openProduct(page, 'CB4828B')
  await expect(page.getByText('3782201')).toBeVisible()
  // Not measured yet, so it has nothing to fail the range with.
  await expect(page.getByText('3797401')).toBeVisible()
  await expect(page.getByText('3800001')).toBeHidden()

  await page.getByRole('tab', { name: 'All Coils', exact: true }).click()
  await page.getByLabel('Search coils').fill('3800001')
  await expect(page.getByText('3800001')).toBeVisible()
  await expect(page.getByText('Coil Filter active')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Coil Filter' })).toBeHidden()
})

test('a coil in Rollforming cannot also be in Trim, and the Slinet waits on a thickness', async ({
  page
}) => {
  await openProduct(page, 'CB4826R')
  await openProduct(page, 'CB4828B')
  await expect(page.getByRole('checkbox', { name: /Slinet holds coil 3782201/ })).toBeEnabled()
  await expect(
    page.getByRole('checkbox', { name: /Rollforming holds coil 3782201/ })
  ).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: /Slinet holds coil 3797401/ })).toBeDisabled()
})

test('moving a coil from Rollforming to Trim asks first', async ({ page }) => {
  await page.getByRole('tab', { name: 'All Coils', exact: true }).click()
  await openProduct(page, 'CB4828B')
  await page.getByRole('checkbox', { name: /Trim holds coil 3800001/ }).click()

  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText(
      'Have you checked with the Rollforming department to ensure that it is ok to move this coil to the Trim department?'
    )
  ).toBeVisible()
  await expect(dialog.getByText(/a coil can only be in one department/)).toBeVisible()
  await dialog.getByRole('button', { name: 'No' }).click()
  await expect(dialog).toBeHidden()
})

test('the search narrows the list to one coil', async ({ page }) => {
  const search = page.getByLabel('Search coils')
  await expect(search).toHaveAttribute('placeholder', 'Search — product / colour / gauge / coil #')
  await search.fill('3797401')

  await expect(page.getByText('3797401')).toBeVisible()
  await expect(page.getByText('3782201')).toBeHidden()

  await search.fill('nothing like it')
  await expect(page.getByText('No coils match')).toBeVisible()
})

test('a search that misses in one folder points to the others', async ({ page }) => {
  await page.route(`${API_URL}/coils/folders/?*`, route =>
    route.fulfill({
      json: [
        { folder_id: 'F-1', name: '26 Ga. B&B Coils', coils: 1 },
        { folder_id: 'F-2', name: '28 Ga. Coils', coils: 1 }
      ]
    })
  )
  await page.route(`${API_URL}/coils/lots/?*`, route => {
    const lots = [
      { ...LOTS[0], folder_id: 'F-1' },
      { ...LOTS[1], folder_id: 'F-2' }
    ]
    return route.fulfill({ json: { count: lots.length, results: lots } })
  })
  await page.reload()

  await page.getByRole('tab', { name: /26 Ga\. B&B Coils/ }).click()
  await page.getByLabel('Search coils').fill('3797401')

  await expect(page.getByText('None in this folder — 1 in other folders.')).toBeVisible()
  await page.getByRole('button', { name: 'Search all folders' }).click()
  await expect(page.getByText('3797401')).toBeVisible()
})

test('the list holds one row per product, opening into its coils', async ({ page }) => {
  await expect(page.getByText('CB4826R')).toBeVisible()
  await expect(page.getByText('3782201')).toBeHidden()
  await openProduct(page, 'CB4826R')
  await expect(page.getByText('3782201')).toBeVisible()
})

test('a product is put in a department with all its coils', async ({ page }) => {
  const moved: string[] = []
  await page.route(`${API_URL}/coils/lots/*/location/`, route => {
    moved.push(new URL(route.request().url()).pathname)
    return route.fulfill({ json: {} })
  })
  await page.getByRole('tab', { name: 'All Coils', exact: true }).click()

  // CB4828B has a coil in Rollforming and one in neither: Rollforming is part-ticked.
  const rollforming = page.getByRole('checkbox', { name: 'Rollforming holds CB4828B' })
  await expect(rollforming).toHaveAttribute('aria-checked', 'mixed')
  await page.getByRole('checkbox', { name: 'Trim holds CB4828B' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/ok to move these 2 coils to the Trim department/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Yes' }).click()
  await expect
    .poll(() => moved.sort())
    .toEqual(['/coils/lots/LOT-42/location/', '/coils/lots/LOT-43/location/'])
})

test('a figure opens the adjustment window, works the others out, and asks before it goes', async ({
  page
}) => {
  await openProduct(page, 'CB4826R')
  await page.getByRole('button', { name: 'Adjust Linear Feet of coil 3782201' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Coil Adjustment')).toBeVisible()
  const feet = dialog.getByLabel('Linear Feet')
  await expect(feet).toBeFocused()
  await expect(feet).toHaveValue('2260')

  await feet.fill('1200')
  await expect(dialog.getByLabel('Coil Thickness')).not.toHaveValue('5.95')
  const applied = page.waitForRequest(request => request.url().endsWith('/apply/'))
  await dialog.getByRole('button', { name: 'Apply' }).click()
  // The figure goes with the build in the window: nothing is saved before the answer.
  expect((await applied).postDataJSON()).toMatchObject({
    linear_feet: 1200,
    material_thickness: expect.any(Number),
    core_od: expect.any(Number)
  })

  await expect(page.getByText('Make this adjustment?')).toBeVisible()
  await expect(page.getByText(/new Linear Feet amount \(1,200 ft\)/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yes, Make Adjustment' })).toBeVisible()
})

test('a coil with no build stays locked until it has one', async ({ page }) => {
  await openProduct(page, 'CB4828B')
  await page.getByRole('button', { name: 'Adjust Weight of coil 3797401' }).click()

  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText(/Enter a Material Thickness under 0.25″ and a Core OD up to 60″ to unlock/)
  ).toBeVisible()
  await expect(dialog.getByLabel('Weight')).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Apply' })).toBeDisabled()

  await dialog.getByLabel('Material Thickness').fill('0.0179')
  await expect(dialog.getByLabel('Weight')).toBeEnabled()
})

test('the coil filter window opens on the saved bounds', async ({ page }) => {
  await page.getByRole('button', { name: 'Coil Filter' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('checkbox')).toHaveCount(3)
  await expect(dialog.getByLabel('Thickness', { exact: true })).toHaveValue('5')
  await expect(dialog.getByLabel('Thickness upper bound')).toHaveValue('6')
  // Apply All is what makes a range limitless, so the boxes under it are shut.
  await expect(dialog.getByLabel('Width', { exact: true })).toBeDisabled()
})

test('the coil list shows 40 products a page', async ({ page }) => {
  const many = Array.from({ length: 45 }, (_, index) =>
    coil(100 + index, `CB${4000 + index}`, String(5000000 + index))
  )
  await page.route(`${API_URL}/coils/lots/?*`, route =>
    route.fulfill({ json: { count: many.length, results: many } })
  )
  await page.reload()

  await expect(page.getByText('1–40 of 45 products')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(40)
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('41–45 of 45 products')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(5)

  // A new search starts again from the first page.
  await page.getByLabel('Search coils').fill('CB400')
  await expect(page.getByText('1–10 of 10 products')).toBeVisible()
})
