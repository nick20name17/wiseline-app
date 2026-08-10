import { expect, test } from '@playwright/test'

import { asRole, at, shared } from './support'

/**
 * A stock card scanned in Trim's own window becomes an order on Trim's board.
 *
 * The two screens share nothing but `wl_orders_pending_v1`, and for a long time nobody read it: the
 * queue was written on every scan and Trim never picked anything up, so the whole point of the card —
 * scan it, get the work in front of the department — did not happen. Neither gate could see it. The
 * parity gate compares rendered screens, and both screens were right.
 */
test('a card scanned in the hosted window lands in Unscheduled', async ({ page }) => {
  await asRole(page, 'manager')
  await page.goto('/trim?view=home')

  const before = await at(page, 'tab-unscheduled-count').innerText()

  await page.getByTitle('Stock Cards (QR pull sheets)').click()
  await expect(at(page, 'stockcards-modal')).toBeVisible()

  // the QR is the scan: clicking it is what a scanner does to the same card on the floor
  await at(page, 'stock-card-1-qr').click()
  await expect(at(page, 'createorder-modal')).toBeVisible()

  const productId = await at(page, 'createorder-field-pid-input').inputValue()
  await at(page, 'createorder-save').click()

  const queued = await shared<{ orders: { orderNo: string; pid: string }[] }>(
    page,
    'wl_orders_pending_v1'
  )
  expect(queued?.orders.map(order => order.pid)).toContain(productId)
  const orderNo = queued?.orders.at(-1)?.orderNo ?? ''
  expect(orderNo).toMatch(/^S\d+$/)

  // closing the window is when a same-document write is reconciled — there is no storage event for it
  await at(page, 'stockcards-x').click()

  await expect(page.getByText(orderNo, { exact: true })).toBeVisible()
  await expect(at(page, 'tab-unscheduled-count')).not.toHaveText(before)
})
