import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

const coil = (id: number, productId: string, lotNumber: string, extra = {}) => ({
  id,
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

test.beforeEach(async ({ page }) => {
  await mockAuthApi(page)
  await mockTrimApi(page)
  // Registered after the shared mocks, so these answer first.
  await page.route(`${API_URL}/coils/filters/*`, route => route.fulfill({ json: [FILTER] }))
  await page.route(`${API_URL}/coils/lots/?*`, route => route.fulfill({ json: LOTS }))
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
  await expect(page.getByText('3782201')).toBeVisible()
  // Not measured yet, so it has nothing to fail the range with.
  await expect(page.getByText('3797401')).toBeVisible()
  await expect(page.getByText('3800001')).toBeHidden()

  await page.getByRole('tab', { name: 'All Coils', exact: true }).click()
  await expect(page.getByText('3800001')).toBeVisible()
  await expect(page.getByText('Coil Filter active')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Coil Filter' })).toBeHidden()
})

test('a coil in Rollforming cannot also be in Trim, and the Slinet waits on a thickness', async ({
  page
}) => {
  await expect(page.getByRole('checkbox', { name: /Slinet holds coil 3782201/ })).toBeEnabled()
  await expect(
    page.getByRole('checkbox', { name: /Rollforming holds coil 3782201/ })
  ).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: /Slinet holds coil 3797401/ })).toBeDisabled()
})

test('moving a coil from Rollforming to Trim asks first', async ({ page }) => {
  await page.getByRole('tab', { name: 'All Coils', exact: true }).click()
  await page.getByRole('checkbox', { name: /Trim holds coil 3800001/ }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Move coil to Trim?')).toBeVisible()
  await expect(dialog.getByText(/both locations can NOT be checked at the same time/)).toBeVisible()
  await dialog.getByRole('button', { name: 'No' }).click()
  await expect(dialog).toBeHidden()
})

test('the search narrows the list to one coil', async ({ page }) => {
  const search = page.getByLabel('Search coils')
  await expect(search).toHaveAttribute('placeholder', 'Search — product / coil #')
  await search.fill('3797401')

  await expect(page.getByText('3797401')).toBeVisible()
  await expect(page.getByText('3782201')).toBeHidden()

  await search.fill('nothing like it')
  await expect(page.getByText('No coils match')).toBeVisible()
})

test('the size grid holds one row per product, opening into its coils', async ({ page }) => {
  await page.getByRole('tab', { name: 'All folders' }).click()

  await expect(page.getByText('CB4826R')).toBeVisible()
  await expect(page.getByText('3782201')).toBeHidden()
  await page.getByRole('button', { name: 'Coils of CB4826R' }).click()
  await expect(page.getByText('3782201')).toBeVisible()
})

test('a figure opens the adjustment window, works the others out, and asks before it goes', async ({
  page
}) => {
  await page.getByRole('button', { name: 'Adjust Linear Feet of coil 3782201' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Coil Adjustment')).toBeVisible()
  const feet = dialog.getByLabel('Linear Feet')
  await expect(feet).toBeFocused()
  await expect(feet).toHaveValue('2260')

  await feet.fill('1200')
  await expect(dialog.getByLabel('Coil Thickness')).not.toHaveValue('5.95')
  await dialog.getByRole('button', { name: 'Apply' }).click()

  await expect(page.getByText('Make this adjustment?')).toBeVisible()
  await expect(page.getByText(/new Linear Feet amount \(1,200 ft\)/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yes, Make Adjustment' })).toBeVisible()
})

test('a coil with no build stays locked until it has one', async ({ page }) => {
  await page.getByRole('button', { name: 'Adjust Weight of coil 3797401' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/Enter Material Thickness and Core OD to unlock/)).toBeVisible()
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
