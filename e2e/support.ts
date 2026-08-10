import type { Page } from '@playwright/test'

/**
 * What every spec needs and nothing else.
 *
 * Elements are addressed by `data-comment`, the same attribute the parity gate compares and the review
 * portal anchors to. A test written against a class or a label would go red the day someone renames one,
 * and green the day the anchor a comment depends on disappears — exactly backwards.
 */

export type Role = 'admin' | 'manager' | 'worker' | 'shipping' | 'driver'

/** The app has no authentication; «Viewing as» is a localStorage key, so a role is set before the load. */
export const asRole = (page: Page, role: Role, department = 'all') =>
  page.addInitScript(
    ([r, d]) => {
      localStorage.setItem('wl_role', r as string)
      localStorage.setItem('wl_dept', d as string)
    },
    [role, department]
  )

export const at = (page: Page, comment: string) => page.locator(`[data-comment="${comment}"]`)

/** The store's own copy of a cross-page contract, read the way the next page will read it. */
export const shared = <T>(page: Page, key: string) =>
  page.evaluate(k => {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as unknown) : null
  }, key) as Promise<T | null>

/** The seed pins its own clock; a date-dependent assertion has to use the same one. */
export const TODAY = { trim: '2026-07-14', rollforming: '2026-07-15', accessories: '2026-07-15' }
