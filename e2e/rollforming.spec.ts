import { expect, test } from '@playwright/test'
import { API_URL, mockAuthApi } from './api.ts'
import { mockTrimApi, signIn } from './trim-api.ts'

// The board's fixtures under the Rollforming department: its tabs, and the coil a line is rolled from.
let posted: { path: string; body: unknown }[]

test.beforeEach(async ({ page }) => {
  posted = []
  await mockAuthApi(page)
  await mockTrimApi(page)
  await page.route(`${API_URL}/departments/all/`, route =>
    route.fulfill({ json: [{ id: 1, name: 'Rollforming', code: 'rollforming' }] })
  )
  await page.route(`${API_URL}/slit-line/?*`, route => {
    const done = new URL(route.request().url()).searchParams.get('slit') === 'true'
    return route.fulfill({
      json: done
        ? []
        : [
            {
              origin_item: '101',
              icon: 'waiting_to_slit',
              locked: true,
              supplier: 'waiting...',
              coil_number: 'waiting...'
            }
          ]
    })
  })
  await page.route(`${API_URL}/coil-assignment/102/coils/`, route =>
    route.fulfill({ json: [{ product_id: 'CS8250', description: 'Dark Red coil', width: 40.875 }] })
  )
  await page.route(`${API_URL}/coil-assignment/102/suppliers/`, route =>
    route.fulfill({ json: [{ supplier: 'COLSTE' }, { supplier: 'SAMSUNG' }] })
  )
  await page.route(`${API_URL}/coil-assignment/coils/CS8250/lots/`, route =>
    route.fulfill({ json: [{ coil_number: 'F7601268', on_hand: 4398.06 }] })
  )
  for (const path of [
    'coil-assignment/assign/',
    'slit-line/request/',
    'slit-line/cancel/',
    'slit-line/mark-slit/'
  ])
    await page.route(`${API_URL}/${path}`, route => {
      posted.push({ path, body: route.request().postDataJSON() })
      return route.fulfill({ json: [] })
    })
})

test('Rollforming has Wrapping for a tab, and no stock cards or bypass', async ({ page }) => {
  await page.goto('/rollforming')
  await signIn(page)

  const strip = page.getByRole('tablist').first()
  await expect(strip.getByRole('tab', { name: /Wrapping/ })).toBeVisible()
  await expect(strip.getByRole('tab', { name: /Production/ })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Stock Cards' })).toBeHidden()
  await expect(page.getByRole('button', { name: /Bypass Production/ })).toBeHidden()
})

test('a line gets a Supplier and a Coil Number picked from its coil’s lots', async ({ page }) => {
  await page.goto('/rollforming?view=scheduled')
  await signIn(page)
  await page.getByRole('button', { name: /^All Scheduled Orders/ }).click()
  await page
    .getByRole('row', { name: /330615/ })
    .getByRole('button')
    .first()
    .click()

  // No machine to assign on this board: the machine comes from the profile in EBMS.
  await expect(page.getByRole('columnheader', { name: 'Machine' })).toBeHidden()
  await page.getByRole('checkbox', { name: 'Select TED8250' }).click()
  await page.getByRole('button', { name: /Select Supplier \/ Coil Number \(1\)/ }).click()

  const dialog = page.getByRole('dialog', { name: 'Select Supplier / Coil Number' })
  // A Coil Number waits on a Supplier p2 (709,459).
  await expect(dialog.getByLabel('Coil Number')).toBeDisabled()
  await dialog.getByLabel('Supplier').click()
  await page.getByRole('option', { name: 'COLSTE' }).click()
  await dialog.getByRole('button', { name: /CS8250/ }).click()
  await dialog.getByRole('button', { name: /F7601268/ }).click()
  await expect(dialog.getByLabel('Coil Number')).toHaveValue('F7601268')
  await dialog.getByRole('button', { name: 'Assign' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual([
    {
      path: 'coil-assignment/assign/',
      body: { origin_items: ['102'], supplier: 'COLSTE', coil_number: 'F7601268' }
    }
  ])
})

test('a line waiting for the Slit Line reads waiting and is taken back off it', async ({
  page
}) => {
  await page.route(`${API_URL}/slit-line/?*`, route =>
    route.fulfill({
      json:
        new URL(route.request().url()).searchParams.get('slit') === 'true'
          ? []
          : [
              {
                origin_item: '102',
                icon: 'waiting_to_slit',
                locked: true,
                supplier: 'waiting...',
                coil_number: 'waiting...'
              }
            ]
    })
  )
  await page.goto('/rollforming?view=scheduled')
  await signIn(page)
  await page.getByRole('button', { name: /^All Scheduled Orders/ }).click()
  await page
    .getByRole('row', { name: /330615/ })
    .getByRole('button')
    .first()
    .click()

  const line = page.getByRole('row', { name: /TED8250/ }).last()
  await expect(line.getByLabel('Waiting for the Slit Line')).toBeVisible()
  await expect(line).toContainText('waiting...')

  await line.getByRole('checkbox', { name: 'Select TED8250' }).click()
  await page.getByRole('button', { name: 'Take off the Slit Line' }).click()
  await expect
    .poll(() => posted)
    .toEqual([{ path: 'slit-line/cancel/', body: { origin_items: ['102'] } }])
})

test('the Slit Line marks waiting material slit with the coil it used', async ({ page }) => {
  await page.route(`${API_URL}/slit-line/?*`, route =>
    route.fulfill({
      json:
        new URL(route.request().url()).searchParams.get('slit') === 'true'
          ? []
          : [
              {
                origin_item: '102',
                order: 'ARINV-3',
                production_date: '2026-09-23',
                icon: 'waiting_to_slit',
                locked: true,
                supplier: 'waiting...',
                coil_number: 'waiting...'
              }
            ]
    })
  )
  await page.goto('/rollforming?view=slit')
  await signIn(page)

  await page.getByRole('checkbox', { name: 'Select TED8250 of 330615' }).click()
  await page.getByRole('button', { name: 'Mark slit (1)' }).click()
  const dialog = page.getByRole('dialog', { name: 'Mark slit' })
  await dialog.getByLabel('Supplier').click()
  await page.getByRole('option', { name: 'SAMSUNG' }).click()
  await dialog.getByLabel('Coil Number').fill('J46A211')
  await dialog.getByRole('button', { name: 'Mark slit' }).click()

  await expect(dialog).toBeHidden()
  expect(posted).toEqual([
    {
      path: 'slit-line/mark-slit/',
      body: { origin_items: ['102'], supplier: 'SAMSUNG', coil_number: 'J46A211' }
    }
  ])
})

test('Wrapping checks a label, and Completed names Rollforming’s own locations', async ({
  page
}) => {
  await page.goto('/rollforming?view=wrapping')
  await signIn(page)

  // A label scanned after its package was deleted says so p2 (980,536).
  await expect(page.getByRole('button', { name: 'Scan package' })).toBeVisible()

  await page.getByRole('button', { name: /Completed orders/ }).click()
  await expect(page.getByRole('columnheader', { name: 'Rollforming Location' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Trim Location' })).toBeHidden()
})
