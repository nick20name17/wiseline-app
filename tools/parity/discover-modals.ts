/**
 * Finds the click that opens each of the prototype's modals, and prints them as `states.ts` entries.
 *
 *   bun tools/parity/discover-modals.ts http://localhost:8848
 *
 * A modal is `display: none` until it opens, and `collect.ts` records only what is visible — so every
 * anchor inside one is outside all three axes of the gate until a state opens it. There are some forty
 * of them and their triggers are spread across fifteen files, so the list is derived rather than typed:
 * for each view, click every `[data-comment]` that looks clickable, see whether an overlay opened, and
 * write down the pair.
 *
 * It reads the *prototype*, which is the specification, and writes nothing but stdout. Two rules keep it
 * honest and quick: a candidate whose name reads like an action rather than a way in is never clicked, so
 * nothing is deleted or released; and an overlay that opens is closed again by its own `×` instead of
 * reloading the page, which is the difference between two minutes and three quarters of an hour.
 */
import { chromium } from 'playwright'

import { PAGES, pageName } from './manifest.ts'

const origin = process.argv[2]
if (!origin) {
  console.error('usage: discover-modals.ts <origin of the prototype>')
  process.exit(1)
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addInitScript(() => {
  localStorage.setItem('wl_role', 'manager')
  localStorage.setItem('wl_dept', 'all')
})
const page = await context.newPage()

/**
 * `domcontentloaded`, not `networkidle`: Rollforming never goes quiet — a run died on its `goto` after
 * harvesting eleven pages, and a crash that throws away the harvest is worse than a page that is a
 * quarter-second early. Every load is also allowed to fail: one unreachable page is not a reason to stop.
 */
const visit = async (url: string) => {
  const response = await page
    .goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    .catch(() => null)
  await page.waitForTimeout(500)
  return !!response
}

/** What is open right now, by overlay id — the prototype marks them all the same way. */
const openOverlays = () =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('.overlay.is-open, .dp-pop, .pop'))
      .map(element => element.id || element.className)
      .filter(Boolean)
  )

const clickables = () =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-comment]'))
      .filter(element => {
        /**
         * Client rects, not `getComputedStyle`: a child of a `display: none` parent reports its own
         * display, not the parent's, so every inactive `.view` was handing over its rows as candidates —
         * a hundred and fifty of them per screen, all invisible, each paying a click timeout to do
         * nothing. A box that is not laid out has no rects.
         */
        if (!element.getClientRects().length) return false
        if (element.closest('.overlay')) return false
        // never a link: the sidebar's own items lead off the page, and one of those ends the run
        if (element.tagName === 'A' || element.closest('.sidebar')) return false
        const tag = element.tagName
        return (
          tag === 'BUTTON' ||
          element.hasAttribute('onclick') ||
          element.classList.contains('row-order') ||
          element.classList.contains('feed-row')
        )
      })
      .map(element => element.getAttribute('data-comment'))
      .filter((comment): comment is string => !!comment)
  )

/**
 * Names that read as doing something rather than opening something. A delete button does open a
 * confirm, but finding it that way means clicking delete on every row of every page — so the few
 * confirms and alerts worth a state are written by hand instead.
 */
const DESTRUCTIVE =
  /del|remove|deplete|release|reset|complete|done|apply|save|submit|print|retry|scan|left|mark|clear|pause|schedule-btn|bypass|select-all|toggle/i

/**
 * `note-btn-1`, `note-btn-2`, … all open the same modal, and a page has a hundred such rows. One per
 * family is enough, and it is the difference between ten minutes and two hours: the run is dominated by
 * candidates that open nothing, each paying a click timeout.
 */
const family = (comment: string) => comment.replace(/[-_]?\d+([-_]\d+)*$/, '')

const found: { page: string; view: string | null; path: string[]; overlay: string }[] = []

/** The openers a modal carries itself — the keypads, pickers and lists reached only from inside one. */
const clickablesInside = () =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('.overlay.is-open [data-comment]'))
      .filter(element => {
        if (!element.getClientRects().length) return false
        return element.tagName === 'BUTTON' || element.hasAttribute('onclick')
      })
      .map(element => element.getAttribute('data-comment'))
      .filter((comment): comment is string => !!comment)
  )

type Find = { page: string; view: string | null; path: string[]; overlay: string }

/** Printed the moment it is found: a run that dies on page twelve still hands over the first eleven. */
const record = (find: Find) => {
  found.push(find)
  console.warn(`  found ${find.overlay} <- ${find.path.join(' > ')}`)
}

/** Shuts whatever opened, so the next candidate is tried on the same page instead of a fresh load. */
const closeOpen = async () => {
  const closer = page.locator('.overlay.is-open [data-comment$="-x"]').first()
  if (await closer.count()) await closer.click({ timeout: 1000 }).catch(() => {})
  else await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(120)
  return (await openOverlays()).length === 0
}

/** Families already tried on this page, so a second view does not pay for the same rows again. */
const tried = new Set<string>()

for (const target of PAGES) {
  const name = pageName(target)
  const url = `${origin}/${target.demo}`
  if (!(await visit(url))) {
    console.warn(`skip ${name} — ${url} did not load`)
    continue
  }

  const views = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.view'))
      .map(view => view.id)
      .filter(Boolean)
  )

  for (const view of views.length ? views : [null]) {
    const show = async () => {
      await visit(url)
      if (!view) return
      await page.evaluate(viewId => {
        const navigate = (window as unknown as { navigate?: (v: string) => void }).navigate
        if (typeof navigate === 'function') navigate(viewId.replace(/^view-/, ''))
      }, view)
      await page.waitForTimeout(400)
    }

    await show()

    /**
     * Phase two needs a way in: most row-level modals — a keypad, a package list, a coil picker — hang
     * off a row that is closed until somebody expands it. So each view is swept twice, once as it
     * renders and once with its first row open, and a find in the second sweep records both clicks.
     */
    const expander = (await clickables()).find(comment => /-exp-|^exp-/.test(comment)) ?? null

    // tabs and view switches are already states of their own, and clicking one hides everything below it
    const all = (await clickables()).filter(
      comment =>
        !DESTRUCTIVE.test(comment) &&
        !/^tab-|^dept-completed|^area-tab-|^mtab-|^prod-mtab-/.test(comment)
    )
    const candidates = all.filter(comment => {
      const key = `${name}::${family(comment)}`
      if (tried.has(key)) return false
      tried.add(key)
      return true
    })

    for (const comment of candidates) {
      const target = page.locator(`[data-comment="${comment}"]`).first()
      if (!(await target.count())) continue

      await target.click({ timeout: 400 }).catch(() => {})
      await page.waitForTimeout(150)

      /**
       * A click that changed which screen is on ends the walk for every candidate after it: the rows it
       * was going to try are `display: none` now, and a click on those waits for a visibility that never
       * comes and gives up quietly. Both kinds — a different page, a different view — put it back.
       */
      const here = await page.evaluate(() => ({
        path: location.pathname,
        view: document.querySelector('.view.active')?.id ?? null
      }))
      if (!url.endsWith(here.path) || (view && here.view !== view)) {
        await show()
        continue
      }

      const opened = await openOverlays()
      if (!opened.length) continue

      for (const overlay of opened) record({ page: name, view, path: [comment], overlay })

      /**
       * Phase three: a modal can be the only way to another one — every keypad in the app is opened from
       * inside the window it types into. So while one is open, its own buttons are swept too.
       */
      for (const inner of await clickablesInside()) {
        const innerTarget = page.locator(`.overlay.is-open [data-comment="${inner}"]`).first()
        if (!(await innerTarget.count())) continue
        await innerTarget.click({ timeout: 400 }).catch(() => {})
        await page.waitForTimeout(150)
        for (const deeper of await openOverlays())
          if (!opened.includes(deeper))
            record({ page: name, view, path: [comment, inner], overlay: deeper })
      }
      // a modal that will not close leaves the page in a state the next candidate would inherit
      if (!(await closeOpen())) await show()
    }
    if (expander) {
      await show()
      await page
        .locator(`[data-comment="${expander}"]`)
        .first()
        .click({ timeout: 400 })
        .catch(() => {})
      await page.waitForTimeout(250)

      const opened_ = (await clickables()).filter(
        comment =>
          !DESTRUCTIVE.test(comment) &&
          !/^tab-|^dept-completed|^area-tab-|^mtab-|^prod-mtab-/.test(comment) &&
          !tried.has(`${name}::${family(comment)}`)
      )
      for (const comment of opened_) {
        tried.add(`${name}::${family(comment)}`)
        const target = page.locator(`[data-comment="${comment}"]`).first()
        if (!(await target.count())) continue
        await target.click({ timeout: 400 }).catch(() => {})
        await page.waitForTimeout(150)
        const shown = await openOverlays()
        if (!shown.length) continue
        for (const overlay of shown)
          record({ page: name, view, path: [expander, comment], overlay })
        if (!(await closeOpen())) {
          await show()
          await page
            .locator(`[data-comment="${expander}"]`)
            .first()
            .click({ timeout: 400 })
            .catch(() => {})
          await page.waitForTimeout(250)
        }
      }
    }

    console.warn(
      `${name} ${view ?? 'page'} — ${candidates.length} of ${all.length} tried, ${found.length} found`
    )
  }
}

await browser.close()

/** One state per overlay: the shortest trigger wins, so the entry is the cheapest way in. */
const best = new Map<string, (typeof found)[number]>()
for (const entry of found) {
  const key = `${entry.page}::${entry.overlay}`
  const current = best.get(key)
  if (!current || entry.path.length < current.path.length) best.set(key, entry)
}

console.log(`\n/* ${best.size} modals reachable in one click */`)
for (const entry of [...best.values()].sort((a, b) => a.page.localeCompare(b.page))) {
  const state = entry.overlay.replace(/^overlay-/, '')
  console.log(`  {
    page: '${entry.page}',
    view: ${entry.view ? `'${entry.view}'` : null},
    name: '${state}',
    clicks: [${entry.path.map(step => `'${step}'`).join(', ')}]
  },`)
}
