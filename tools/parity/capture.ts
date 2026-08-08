/**
 * Records one build — the HTML prototype or the React port — as a set of captures plus screenshots.
 *
 *   bun tools/parity/capture.ts demo   http://localhost:8848
 *   bun tools/parity/capture.ts port   http://localhost:5173
 *
 * The prototype is the baseline; recording it is the first thing done and the last thing changed.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { chromium, type Page as BrowserPage } from 'playwright'

import { type Capture, collectSource } from './collect.ts'
import { PAGES, pageName, VIEWPORTS, type Page } from './manifest.ts'
import { statesFor } from './states.ts'

const [side, origin] = process.argv.slice(2)

if (side !== 'demo' && side !== 'port') {
  console.error('usage: capture.ts <demo|port> <origin>')
  process.exit(1)
}
if (!origin) {
  console.error('an origin is required — nothing is assumed about where a build is served')
  process.exit(1)
}

const outputDir = join(import.meta.dir, '..', '..', 'parity', side)

const urlFor = (page: Page) =>
  side === 'demo' ? `${origin}/${page.demo}` : `${origin}${page.route}`

/**
 * Which views a page has, asked of the page rather than of a list here: the prototype toggles `.view`
 * divs, and it is the authority on which ones exist. A page with none is captured once, as itself.
 */
const viewsOf = (browserPage: BrowserPage) =>
  browserPage.evaluate(() =>
    Array.from(document.querySelectorAll('.view'))
      .map(view => view.id)
      .filter(Boolean)
  )

/**
 * The port renders only the view it is showing, so its DOM cannot be asked what the others are — it is
 * told, from what the prototype said. That also keeps both sides walking the same list while the port
 * is unfinished and renders nothing for half of it.
 */
const portViews = async (page: Page) => {
  const baseline = JSON.parse(
    await readFile(join(import.meta.dir, '..', '..', 'parity', 'demo', 'captures.json'), 'utf8')
  ) as { page: string; view: string | null }[]

  return [
    ...new Set(
      baseline
        .filter(capture => capture.page === pageName(page))
        // a state is recorded under `<view>+<state>`, and it is a view plus some clicks, not a view
        .map(capture => capture.view?.split('+')[0] ?? null)
    )
  ].filter((view): view is string => view !== null)
}

/** The prototype's own way in is its `navigate()`; the port's is its URL. */
const showView = (browserPage: BrowserPage, view: string, page: Page) =>
  side === 'demo'
    ? browserPage.evaluate(viewId => {
        const navigate = (window as unknown as { navigate?: (page: string) => void }).navigate
        if (typeof navigate === 'function') navigate(viewId.replace(/^view-/, ''))
      }, view)
    : browserPage.goto(`${origin}${page.route}?view=${view.replace(/^view-/, '')}`, {
        waitUntil: 'networkidle'
      })

/**
 * Walks a state's clicks, addressing each by `data-comment`. Returns the step that could not be
 * reached, so a state nobody has ported yet is reported rather than captured as whatever was on
 * screen — a screenshot of the wrong tab compares clean against nothing at all.
 */
const walk = async (browserPage: BrowserPage, clicks: string[]) => {
  for (const comment of clicks) {
    const target = browserPage.locator(`[data-comment="${comment}"]`).first()
    if (!(await target.count())) return comment
    await target.click()
    await browserPage.waitForTimeout(250)
  }
  return null
}

const browser = await chromium.launch()
const captures: Capture[] = []

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }
  })
  /**
   * The port guards its pages and would answer every one of them with the sign-in screen. The
   * prototype has no guard and defaults to a Manager viewing every department, so that is who the
   * port is captured as — anything else compares two different people's screens.
   */
  await context.addInitScript(() => {
    localStorage.setItem('wl_role', 'manager')
    localStorage.setItem('wl_dept', 'all')
  })

  /**
   * The one page that has to be looked at signed out — the port sends a signed-in viewer straight
   * past it. A second context rather than clearing storage, because the init script above runs again
   * on every navigation and would put the viewer back.
   */
  const signedOutContext = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }
  })

  const signedInPage = await context.newPage()
  const signedOutPage = await signedOutContext.newPage()

  for (const page of PAGES) {
    const name = pageName(page)
    const url = urlFor(page)
    const browserPage = page.route === '/sign-in' ? signedOutPage : signedInPage

    const response = await browserPage.goto(url, { waitUntil: 'networkidle' }).catch(() => null)
    if (!response || !response.ok()) {
      console.warn(`skip ${name} @ ${viewport.name} — ${url} did not load`)
      continue
    }

    const views = side === 'demo' ? await viewsOf(browserPage) : await portViews(page)

    /**
     * The views share one store, so a click made for one state is still made when the next view
     * renders — expanding an order on Unscheduled put its line items into the Scheduled baseline,
     * which is a baseline of a screen nobody was looking at. Only a state clicks anything, so only a
     * state leaves the page dirty, and only a dirty page has to be paid for with a reload: the
     * fifteen pages that have no states navigate exactly as often as they did before.
     */
    let dirty = false

    const open = async (view: string | null) => {
      if (dirty) await browserPage.goto(url, { waitUntil: 'networkidle' })
      dirty = false
      if (!view) return
      await showView(browserPage, view, page)
      // the prototype's view transition is 400ms, and a screenshot mid-fade is not a baseline
      await browserPage.waitForTimeout(600)
    }

    for (const view of views.length ? views : [null]) {
      await open(view)

      const record = async (stateName: string | null) => {
        /**
         * Which page the browser is actually on, checked against the one being recorded.
         *
         * A run once filed thirteen mobile captures under the name of the page before them: the
         * content was right and every label was wrong, so the gate compared real screens against
         * each other's baselines and said nothing. A baseline is only worth having if a mislabelled
         * one is impossible, and the browser already knows the answer.
         */
        const here = await browserPage.evaluate(() => location.pathname)
        const expected = side === 'demo' ? `/${page.demo}` : page.route
        if (here !== expected)
          throw new Error(
            `recording ${name} but the browser is on ${here}, not ${expected} — baseline would be mislabelled`
          )

        const collected = (await browserPage.evaluate(collectSource)) as Pick<
          Capture,
          'comments' | 'tree'
        >
        const viewKey = stateName ? `${view}+${stateName}` : view
        captures.push({ page: name, view: viewKey, viewport: viewport.name, ...collected })

        /**
         * `fullPage` already means the gate does not judge where the page is scrolled to; horizontal
         * scrollers inside it are the same kind of fact, and they are judged only by accident. The
         * prototype replaces its markup wholesale on every click, so its machine-tab strip snaps back
         * to the left; React keeps the node and the browser leaves the tapped tab in view. Both are
         * wound back before the shot, on both sides, so the screenshot compares what was rendered
         * rather than which build destroys more of its DOM.
         */
        await browserPage.evaluate(() => {
          for (const element of document.querySelectorAll('*'))
            if (element.scrollLeft) element.scrollLeft = 0
        })

        const shot = [name, viewKey ?? 'page', viewport.name].join('__')
        await mkdir(join(outputDir, 'shots'), { recursive: true })
        await browserPage.screenshot({
          path: join(outputDir, 'shots', `${shot}.png`),
          fullPage: true,
          animations: 'disabled'
        })
        console.log(`${shot}: ${collected.comments.length} data-comment`)
      }

      await record(null)

      for (const state of statesFor(name, view)) {
        await open(view)

        dirty = true
        const missed = await walk(browserPage, state.clicks)
        if (missed) {
          console.warn(`skip ${name}__${view}+${state.name} @ ${viewport.name} — no ${missed}`)
          continue
        }
        await record(state.name)
      }
    }
  }

  await context.close()
  await signedOutContext.close()
}

await browser.close()
await writeFile(join(outputDir, 'captures.json'), `${JSON.stringify(captures, null, 2)}\n`)
console.log(`\n${captures.length} captures → parity/${side}/`)
